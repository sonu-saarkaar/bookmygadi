from fastapi import APIRouter, Depends, HTTPException
from pymongo.database import Database

from app.admin_panel.db.mongo import get_mongo_db
from app.admin_panel.schemas.contracts import AdminAuthResponse, AdminLoginRequest
from app.admin_panel.services.common import init_doc
from app.admin_panel.utils.security import create_admin_token, hash_password, verify_password

router = APIRouter(prefix="/admin/auth", tags=["admin-auth"])


@router.post("/login", response_model=AdminAuthResponse)
def admin_login(payload: AdminLoginRequest, db: Database = Depends(get_mongo_db)) -> AdminAuthResponse:
    admin = db["admins"].find_one({"email": payload.email.lower().strip()})
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(payload.password, admin.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_admin_token(admin)
    return AdminAuthResponse(access_token=token, role=admin.get("role", "ops_admin"), name=admin.get("name", "Admin"))


@router.post("/seed")
def seed_admins(db: Database = Depends(get_mongo_db)) -> dict:
    if db["admins"].count_documents({}) > 0:
        return {"seeded": False, "message": "Admins already exist"}

    rows = [
        init_doc({"name": "Super Admin", "email": "super@bookmygadi.com", "role": "super_admin", "password_hash": hash_password("super123")}),
        init_doc({"name": "Ops Admin", "email": "ops@bookmygadi.com", "role": "ops_admin", "password_hash": hash_password("ops12345")}),
        init_doc({"name": "Support Agent", "email": "support@bookmygadi.com", "role": "support_agent", "password_hash": hash_password("support123")}),
        init_doc({"name": "Finance Manager", "email": "finance@bookmygadi.com", "role": "finance_manager", "password_hash": hash_password("finance123")}),
    ]
    db["admins"].insert_many(rows)
    return {"seeded": True, "count": len(rows)}
