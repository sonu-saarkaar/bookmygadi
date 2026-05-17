import csv
import io
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.db import get_db
from app.api.common.deps import get_admin_user
from app.core.security import decode_access_token
from app.models import User, CRMDriver, CRMTeamMember, CRMDriverAssignment, CRMDriverLog, CRMReferral, BroadcastCampaign, ReferralSettings, UserReferral
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from app.core.notifications import _send_bulk_fcm

router = APIRouter(prefix="/crm", tags=["crm"])

# --- Schemas ---
class TeamMemberRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    email: str
    role: str

class ReferralRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    referral_id: Optional[str] = None
    referral_name: Optional[str] = None
    referral_type: str

class DriverLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    action: str
    changed_by_name: str
    created_at: datetime

class AssignmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    assigned_by: str
    assigned_to: str
    created_at: datetime

class DriverRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    phone: str
    address: Optional[str] = None
    vehicle_type: str
    brand_model: str
    registration_number: str
    license_number: Optional[str] = None
    rc_number: Optional[str] = None
    insurance_number: Optional[str] = None
    status: str
    assigned_member_id: Optional[str] = None
    blocked_by: Optional[str] = None
    blocked_reason: Optional[str] = None
    blocked_at: Optional[datetime] = None
    created_at: datetime
    referral: Optional[ReferralRead] = None
    logs: List[DriverLogRead] = []
    assignments: List[AssignmentRead] = []

class AssignRequest(BaseModel):
    team_member_id: str

class ActionRequest(BaseModel):
    note: str = ""

class BlockRequest(BaseModel):
    reason: str

class BroadcastRequest(BaseModel):
    title: str
    message: str
    target_audience: str # all, users, riders
    image_url: Optional[str] = None
    channel: str = "push"

class ReferralSettingsUpdate(BaseModel):
    is_active: bool
    signup_bonus: int
    referrer_bonus: int
    max_referrals_per_user: int
    terms: Optional[str] = None

# --- Helper ---
def log_action(db: Session, driver_id: str, action: str, admin_name: str):
    log = CRMDriverLog(driver_id=driver_id, action=action, changed_by_name=admin_name)
    db.add(log)


# --- APIs ---
@router.get("/drivers", response_model=List[DriverRead])
def list_drivers(
    status: Optional[str] = Query(None),
    assigned_member_id: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    _: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    query = db.query(CRMDriver)
    if status:
        query = query.filter(CRMDriver.status == status)
    if assigned_member_id:
        query = query.filter(CRMDriver.assigned_member_id == assigned_member_id)
    if q:
        key = f"%{q.strip()}%"
        query = query.filter(CRMDriver.name.ilike(key) | CRMDriver.phone.ilike(key))
    
    return query.order_by(CRMDriver.created_at.desc()).all()


@router.get("/team-members", response_model=List[TeamMemberRead])
def list_team_members(_: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    return db.query(CRMTeamMember).all()


@router.post("/drivers/{driver_id}/assign")
def assign_driver(driver_id: str, payload: AssignRequest, admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    driver = db.query(CRMDriver).filter(CRMDriver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
        
    team_member = db.query(CRMTeamMember).filter(CRMTeamMember.id == payload.team_member_id).first()
    if not team_member:
        raise HTTPException(status_code=404, detail="Team member not found")

    driver.assigned_member_id = team_member.id
    
    # We need a record in team_members for the admin performing the action
    # For now, just use admin.name if no team member representation exists
    admin_team_member = db.query(CRMTeamMember).filter(CRMTeamMember.email == admin.email).first()
    assigned_by_id = admin_team_member.id if admin_team_member else team_member.id

    assignment = CRMDriverAssignment(
        driver_id=driver.id,
        assigned_by=assigned_by_id,
        assigned_to=team_member.id
    )
    db.add(assignment)
    
    log_action(db, driver.id, f"Assigned to {team_member.name}", admin.name)
    db.commit()
    return {"ok": True, "message": "Driver assigned"}


@router.post("/drivers/{driver_id}/approve")
def approve_driver(driver_id: str, payload: ActionRequest, admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    driver = db.query(CRMDriver).filter(CRMDriver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    driver.status = "APPROVED"
    note_str = f": {payload.note}" if payload.note else ""
    log_action(db, driver.id, f"Status changed to APPROVED{note_str}", admin.name)
    db.commit()
    return {"ok": True}

@router.post("/drivers/{driver_id}/reject")
def reject_driver(driver_id: str, payload: ActionRequest, admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    driver = db.query(CRMDriver).filter(CRMDriver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    driver.status = "REJECTED"
    note_str = f": {payload.note}" if payload.note else ""
    log_action(db, driver.id, f"Status changed to REJECTED{note_str}", admin.name)
    db.commit()
    return {"ok": True}

@router.post("/drivers/{driver_id}/refile")
def refile_driver(driver_id: str, payload: ActionRequest, admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    driver = db.query(CRMDriver).filter(CRMDriver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    driver.status = "REVIEW"
    note_str = f": {payload.note}" if payload.note else ""
    log_action(db, driver.id, f"Status changed to REVIEW{note_str}", admin.name)
    db.commit()
    return {"ok": True}

@router.post("/drivers/{driver_id}/block")
def block_driver(driver_id: str, payload: BlockRequest, admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    driver = db.query(CRMDriver).filter(CRMDriver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    driver.status = "BLOCKED"
    driver.blocked_by = admin.name
    driver.blocked_reason = payload.reason
    driver.blocked_at = datetime.utcnow()
    log_action(db, driver.id, f"Blocked Rider: {payload.reason}", admin.name)
    db.commit()
    return {"ok": True}


@router.get("/export-csv")
def export_csv(token: Optional[str] = Query(None), db: Session = Depends(get_db)):
    if token:
        user_id = decode_access_token(token)
        user = db.get(User, user_id) if user_id else None
        if not user or user.role != "admin":
            raise HTTPException(status_code=403, detail="Not authorized")
    else:
        raise HTTPException(status_code=401, detail="Token required")
        
    drivers = db.query(CRMDriver).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Name", "Phone", "Status", "Vehicle Type", "Brand/Model", "Reg Number", "Created At"])
    for d in drivers:
        writer.writerow([d.id, d.name, d.phone, d.status, d.vehicle_type, d.brand_model, d.registration_number, d.created_at])
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=drivers_export.csv"}
    )

@router.get("/export-excel")
def export_excel(token: Optional[str] = Query(None), db: Session = Depends(get_db)):
    if token:
        user_id = decode_access_token(token)
        user = db.get(User, user_id) if user_id else None
        if not user or user.role != "admin":
            raise HTTPException(status_code=403, detail="Not authorized")
    else:
        raise HTTPException(status_code=401, detail="Token required")
        
    # Simulating Excel export via CSV formatted as XLS
    drivers = db.query(CRMDriver).all()
    output = io.StringIO()
    writer = csv.writer(output, delimiter="\t")
    writer.writerow(["ID", "Name", "Phone", "Status", "Vehicle Type", "Brand/Model", "Reg Number", "Created At"])
    for d in drivers:
        writer.writerow([d.id, d.name, d.phone, d.status, d.vehicle_type, d.brand_model, d.registration_number, d.created_at])
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="application/vnd.ms-excel",
        headers={"Content-Disposition": "attachment; filename=drivers_export.xls"}
    )

@router.get("/dashboard-analytics")
def dashboard_analytics(_: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    drivers = db.query(CRMDriver).all()
    total = len(drivers)
    pending = sum(1 for d in drivers if d.status in ["NEW", "REVIEW"])
    approved = sum(1 for d in drivers if d.status == "APPROVED")
    rejected = sum(1 for d in drivers if d.status == "REJECTED")
    blocked = sum(1 for d in drivers if d.status == "BLOCKED")
    return {
        "total_drivers": total,
        "pending_approvals": pending,
        "approved_drivers": approved,
        "rejected_drivers": rejected,
        "blocked_drivers": blocked,
    }

@router.post("/broadcast")
async def send_broadcast(payload: BroadcastRequest, admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    # 1. Fetch target FCM tokens
    tokens_query = db.query(User.fcm_token).filter(User.fcm_token.isnot(None))
    if payload.target_audience == "users":
        tokens_query = tokens_query.filter(User.role == "customer")
    elif payload.target_audience == "riders":
        tokens_query = tokens_query.filter(User.role == "driver")
    
    tokens = [t[0] for t in tokens_query.all()]
    
    # 2. Send via FCM
    sent_count = 0
    if tokens:
        sent_count = await _send_bulk_fcm(
            tokens=tokens,
            title=payload.title,
            body=payload.message,
            data={"image": payload.image_url} if payload.image_url else None
        )
    
    # 3. Save to campaign history
    campaign = BroadcastCampaign(
        title=payload.title,
        message=payload.message,
        image_url=payload.image_url,
        target_audience=payload.target_audience,
        channel=payload.channel,
        sent_count=sent_count,
        created_by=admin.name,
        status="sent" if sent_count > 0 else "failed"
    )
    db.add(campaign)
    db.commit()
    
    return {"ok": True, "sent_count": sent_count}

@router.get("/broadcasts", response_model=List[dict])
def list_broadcasts(_: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    campaigns = db.query(BroadcastCampaign).order_by(BroadcastCampaign.created_at.desc()).all()
    return [
        {
            "id": c.id,
            "title": c.title,
            "message": c.message,
            "target": c.target_audience,
            "sent_count": c.sent_count,
            "created_at": c.created_at,
            "status": c.status
        } for c in campaigns
    ]

@router.get("/referral/settings")
def get_referral_settings(_: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    settings = db.query(ReferralSettings).filter(ReferralSettings.id == "global_config").first()
    if not settings:
        settings = ReferralSettings(id="global_config")
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

@router.post("/referral/settings")
def update_referral_settings(payload: ReferralSettingsUpdate, _: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    settings = db.query(ReferralSettings).filter(ReferralSettings.id == "global_config").first()
    if not settings:
        settings = ReferralSettings(id="global_config")
        db.add(settings)
    
    settings.is_active = payload.is_active
    settings.signup_bonus = payload.signup_bonus
    settings.referrer_bonus = payload.referrer_bonus
    settings.max_referrals_per_user = payload.max_referrals_per_user
    settings.terms = payload.terms
    
    db.commit()
    return {"ok": True}

@router.get("/referral/stats")
def get_referral_stats(_: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    total_referrals = db.query(UserReferral).count()
    rewarded_referrals = db.query(UserReferral).filter(UserReferral.status == "rewarded").count()
    total_distributed = db.query(UserReferral).filter(UserReferral.status == "rewarded").with_entities(UserReferral.reward_amount).all()
    total_amt = sum(float(r[0]) for r in total_distributed)
    
    return {
        "total_referrals": total_referrals,
        "rewarded_count": rewarded_referrals,
        "total_distributed_amount": total_amt
    }

@router.post("/seed")
def seed_crm_data(db: Session = Depends(get_db)):
    if db.query(CRMTeamMember).count() == 0:
        tm1 = CRMTeamMember(name="Super Admin", email="superadmin@bookmygadi.com", role="SUPER ADMIN")
        tm2 = CRMTeamMember(name="John Doe", email="john@bookmygadi.com", role="ADMIN")
        tm3 = CRMTeamMember(name="Jane Smith", email="jane@bookmygadi.com", role="TEAM MEMBER")
        db.add_all([tm1, tm2, tm3])
        db.commit()

        d1 = CRMDriver(name="Rahul Kumar", phone="9988776655", vehicle_type="car", brand_model="Swift Dzire", registration_number="UP65AB1234", status="NEW REQUEST", address="Varanasi")
        d2 = CRMDriver(name="Amit Singh", phone="9988776656", vehicle_type="car", brand_model="Innova", registration_number="UP65AB1235", status="UNDER REVIEW", assigned_member_id=tm2.id)
        d3 = CRMDriver(name="Sumit Yadav", phone="9988776657", vehicle_type="auto", brand_model="Bajaj RE", registration_number="UP65AB1236", status="APPROVED")
        db.add_all([d1, d2, d3])
        db.commit()

        db.add(CRMReferral(driver_id=d1.id, referral_name="Facebook Ad", referral_type="External"))
        db.add(CRMReferral(driver_id=d2.id, referral_name="tm2", referral_id=tm2.id, referral_type="Team Member"))
        
        log_action(db, d2.id, "Status changed to UNDER REVIEW", "John Doe")
        log_action(db, d3.id, "Status changed to APPROVED", "Super Admin")
        db.commit()
    return {"ok": True, "message": "Seeded CRM data"}
