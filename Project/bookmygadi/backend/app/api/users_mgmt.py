import csv
import io
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from app.db import get_db
from app.api.deps import get_admin_user
from app.core.security import decode_access_token
from app.models import User, Ride, Coupon, UserCoupon, UserReferral, AdminAuditLog
from pydantic import BaseModel, ConfigDict
from typing import List, Optional

router = APIRouter(prefix="/users-mgmt", tags=["user_management"])

# --- Schemas ---
class UserMgmtRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    city: Optional[str] = None
    role: str
    status: str
    is_blocked: bool
    blocked_reason: Optional[str] = None
    total_rides: int
    total_spending: float
    last_active_at: Optional[datetime] = None
    referral_source: Optional[str] = None
    created_at: datetime

class UserStatusUpdate(BaseModel):
    status: str
    reason: Optional[str] = None

class CouponCreate(BaseModel):
    code: str
    discount_amount: float
    discount_type: str
    max_uses: int
    expiry_date: Optional[datetime] = None

class AssignCouponReq(BaseModel):
    coupon_id: str

# --- Helper ---
def log_action(db: Session, admin: User, action: str):
    log = AdminAuditLog(module="UserMgmt", action=action, admin_id=admin.id, admin_name=admin.name, admin_role=admin.role, status="success")
    db.add(log)

# --- Endpoints ---

@router.get("/dashboard")
def get_user_dashboard(_: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    users = db.query(User).all()
    total = len(users)
    active = sum(1 for u in users if u.status == "active")
    verified = sum(1 for u in users if u.status == "verified")
    blocked = sum(1 for u in users if u.status == "blocked" or u.is_blocked)
    
    one_week_ago = datetime.utcnow().timestamp() - (7 * 24 * 60 * 60)
    new_users = sum(1 for u in users if u.created_at.timestamp() >= one_week_ago)
    
    return {
        "total_users": total,
        "active_users": active,
        "verified_users": verified,
        "blocked_users": blocked,
        "new_users_this_week": new_users
    }

@router.get("/list", response_model=List[UserMgmtRead])
def list_users(
    status: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    _: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    query = db.query(User)
    if status:
        if status == "blocked":
            query = query.filter(or_(User.status == "blocked", User.is_blocked == True))
        else:
            query = query.filter(User.status == status)
    if role:
        query = query.filter(User.role == role)
    if q:
        key = f"%{q.strip()}%"
        query = query.filter(or_(User.name.ilike(key), User.email.ilike(key), User.phone.ilike(key), User.city.ilike(key)))
    
    return query.order_by(User.created_at.desc()).all()

@router.get("/{user_id}", response_model=UserMgmtRead)
def get_user(user_id: str, _: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.post("/{user_id}/status")
def update_user_status(user_id: str, payload: UserStatusUpdate, admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.status = payload.status
    if payload.status == "blocked":
        user.is_blocked = True
        user.blocked_reason = payload.reason
    elif payload.status in ["active", "verified", "dummy"]:
        user.is_blocked = False
        user.blocked_reason = None
        
    log_action(db, admin, f"Updated user {user.email} status to {payload.status}")
    db.commit()
    return {"ok": True}

@router.get("/{user_id}/rides")
def get_user_rides(user_id: str, _: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    rides = db.query(Ride).filter(or_(Ride.customer_id == user_id, Ride.driver_id == user_id)).order_by(Ride.created_at.desc()).all()
    return rides

@router.get("/{user_id}/coupons")
def get_user_coupons(user_id: str, _: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    user_coupons = db.query(UserCoupon, Coupon).join(Coupon, UserCoupon.coupon_id == Coupon.id).filter(UserCoupon.user_id == user_id).all()
    return [{"id": uc.id, "is_used": uc.is_used, "used_at": uc.used_at, "coupon_code": c.code, "discount": c.discount_amount, "type": c.discount_type} for uc, c in user_coupons]

@router.post("/coupons")
def create_coupon(payload: CouponCreate, admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    c = Coupon(code=payload.code, discount_amount=payload.discount_amount, discount_type=payload.discount_type, max_uses=payload.max_uses, expiry_date=payload.expiry_date)
    db.add(c)
    log_action(db, admin, f"Created coupon {payload.code}")
    db.commit()
    return {"ok": True}

@router.post("/{user_id}/coupons")
def assign_coupon(user_id: str, payload: AssignCouponReq, admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    uc = UserCoupon(user_id=user_id, coupon_id=payload.coupon_id)
    db.add(uc)
    log_action(db, admin, f"Assigned coupon {payload.coupon_id} to user {user_id}")
    db.commit()
    return {"ok": True}

@router.get("/{user_id}/referrals")
def get_user_referrals(user_id: str, _: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    invited = db.query(UserReferral, User).join(User, UserReferral.invitee_id == User.id).filter(UserReferral.inviter_id == user_id).all()
    return [{"id": ur.id, "invitee_name": u.name, "invitee_email": u.email, "reward": ur.reward_amount, "status": ur.status, "date": ur.created_at} for ur, u in invited]

@router.get("/export/csv")
def export_users_csv(token: Optional[str] = Query(None), db: Session = Depends(get_db)):
    if token:
        user_id = decode_access_token(token)
        admin = db.get(User, user_id) if user_id else None
        if not admin or admin.role != "admin":
            raise HTTPException(status_code=403, detail="Not authorized")
    else:
        raise HTTPException(status_code=401, detail="Token required")
        
    users = db.query(User).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Name", "Email", "Phone", "Role", "Status", "Total Rides", "Total Spending"])
    for u in users:
        writer.writerow([u.id, u.name, u.email, u.phone, u.role, u.status, u.total_rides, u.total_spending])
    output.seek(0)
    return StreamingResponse(output, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=users_export.csv"})

@router.get("/export/excel")
def export_users_excel(token: Optional[str] = Query(None), db: Session = Depends(get_db)):
    if token:
        user_id = decode_access_token(token)
        admin = db.get(User, user_id) if user_id else None
        if not admin or admin.role != "admin":
            raise HTTPException(status_code=403, detail="Not authorized")
    else:
        raise HTTPException(status_code=401, detail="Token required")
        
    users = db.query(User).all()
    output = io.StringIO()
    writer = csv.writer(output, delimiter="\t")
    writer.writerow(["ID", "Name", "Email", "Phone", "Role", "Status", "Total Rides", "Total Spending"])
    for u in users:
        writer.writerow([u.id, u.name, u.email, u.phone, u.role, u.status, u.total_rides, u.total_spending])
    output.seek(0)
    return StreamingResponse(output, media_type="application/vnd.ms-excel", headers={"Content-Disposition": "attachment; filename=users_export.xls"})
