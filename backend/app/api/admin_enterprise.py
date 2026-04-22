from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_admin_user
from app.db import get_db
from app.models import (
    AdminAuditLog,
    AdminTeamMember,
    CompanyFounderProfile,
    DispatchControl,
    PolicyDocument,
    RideSearchEvent,
    User,
)


router = APIRouter(prefix="/admin/enterprise", tags=["admin-enterprise"])


def _audit(db: Session, admin: User, module: str, action: str, status: str = "success") -> None:
    db.add(
        AdminAuditLog(
            module=module,
            action=action,
            admin_id=admin.id,
            admin_name=admin.name,
            admin_role=admin.role,
            status=status,
        )
    )


class TeamMemberPayload(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str
    role: str = Field(default="operations")
    permissions: str | None = None
    access_level: str = "standard"
    ownership_percentage: float | None = None
    is_active: bool = True


class FounderPayload(BaseModel):
    founder_type: str = Field(pattern="^(founder|co_founder)$")
    full_name: str = Field(min_length=2, max_length=120)
    email: str
    phone: str | None = None
    identity_document: str | None = None
    company_documents: str | None = None
    contact_address: str | None = None
    is_admin_enabled: bool = True
    member_id: str | None = None


class PolicyPayload(BaseModel):
    title: str = Field(min_length=3, max_length=150)
    content: str = ""
    is_published: bool = True


class SearchAssignPayload(BaseModel):
    driver_id: str


class DispatchPayload(BaseModel):
    mode: str = Field(pattern="^(auto|manual|hybrid)$")
    notes: str | None = None


@router.get("/team-members")
def list_team_members(
    _: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    rows = db.query(AdminTeamMember).order_by(AdminTeamMember.created_at.desc()).all()
    return [
        {
            "id": r.id,
            "name": r.name,
            "email": r.email,
            "role": r.role,
            "permissions": r.permissions,
            "access_level": r.access_level,
            "ownership_percentage": r.ownership_percentage,
            "is_active": r.is_active,
            "created_at": r.created_at,
        }
        for r in rows
    ]


@router.post("/team-members")
def create_team_member(
    payload: TeamMemberPayload,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> dict:
    existing = db.query(AdminTeamMember).filter(AdminTeamMember.email == payload.email.strip().lower()).first()
    if existing:
        raise HTTPException(status_code=409, detail="Team member already exists with this email")
    row = AdminTeamMember(
        name=payload.name.strip(),
        email=payload.email.strip().lower(),
        role=payload.role.strip().lower(),
        permissions=payload.permissions,
        access_level=payload.access_level,
        ownership_percentage=payload.ownership_percentage,
        is_active=payload.is_active,
    )
    db.add(row)
    _audit(db, admin, "team", f"created team member {row.email}")
    db.commit()
    db.refresh(row)
    return {"ok": True, "id": row.id}


@router.patch("/team-members/{member_id}")
def update_team_member(
    member_id: str,
    payload: TeamMemberPayload,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> dict:
    row = db.get(AdminTeamMember, member_id)
    if not row:
        raise HTTPException(status_code=404, detail="Team member not found")
    row.name = payload.name.strip()
    row.email = payload.email.strip().lower()
    row.role = payload.role.strip().lower()
    row.permissions = payload.permissions
    row.access_level = payload.access_level
    row.ownership_percentage = payload.ownership_percentage
    row.is_active = payload.is_active
    _audit(db, admin, "team", f"updated team member {member_id}")
    db.commit()
    return {"ok": True}


@router.get("/company/founders")
def list_founders(
    _: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    rows = db.query(CompanyFounderProfile).order_by(CompanyFounderProfile.created_at.desc()).all()
    return [
        {
            "id": r.id,
            "member_id": r.member_id,
            "founder_type": r.founder_type,
            "full_name": r.full_name,
            "email": r.email,
            "phone": r.phone,
            "identity_document": r.identity_document,
            "company_documents": r.company_documents,
            "contact_address": r.contact_address,
            "is_admin_enabled": r.is_admin_enabled,
            "created_at": r.created_at,
        }
        for r in rows
    ]


@router.post("/company/founders")
def upsert_founder(
    payload: FounderPayload,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> dict:
    row = db.query(CompanyFounderProfile).filter(CompanyFounderProfile.email == payload.email.strip().lower()).first()
    if not row:
        row = CompanyFounderProfile(email=payload.email.strip().lower(), full_name=payload.full_name.strip(), founder_type=payload.founder_type)
        db.add(row)
    row.member_id = payload.member_id
    row.founder_type = payload.founder_type
    row.full_name = payload.full_name.strip()
    row.phone = payload.phone
    row.identity_document = payload.identity_document
    row.company_documents = payload.company_documents
    row.contact_address = payload.contact_address
    row.is_admin_enabled = payload.is_admin_enabled
    _audit(db, admin, "company", f"upserted founder profile {row.email}")
    db.commit()
    db.refresh(row)
    return {"ok": True, "id": row.id}


@router.get("/policies/{policy_type}")
def get_policy(
    policy_type: str,
    _: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> dict:
    normalized = policy_type.strip().lower()
    if normalized not in {"terms", "privacy", "refund"}:
        raise HTTPException(status_code=400, detail="Invalid policy type")
    row = db.query(PolicyDocument).filter(PolicyDocument.policy_type == normalized).first()
    if not row:
        return {
            "policy_type": normalized,
            "title": normalized.title(),
            "content": "",
            "is_published": False,
            "updated_at": None,
        }
    return {
        "policy_type": row.policy_type,
        "title": row.title,
        "content": row.content,
        "is_published": row.is_published,
        "updated_at": row.updated_at,
        "last_updated_by": row.last_updated_by,
    }


@router.put("/policies/{policy_type}")
def save_policy(
    policy_type: str,
    payload: PolicyPayload,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> dict:
    normalized = policy_type.strip().lower()
    if normalized not in {"terms", "privacy", "refund"}:
        raise HTTPException(status_code=400, detail="Invalid policy type")
    row = db.query(PolicyDocument).filter(PolicyDocument.policy_type == normalized).first()
    if not row:
        row = PolicyDocument(policy_type=normalized, title=payload.title)
        db.add(row)
    row.title = payload.title.strip()
    row.content = payload.content
    row.is_published = payload.is_published
    row.last_updated_by = admin.email
    _audit(db, admin, "policy", f"updated {normalized} policy")
    db.commit()
    return {"ok": True}


@router.get("/search-monitor")
def list_search_monitor(
    status: str | None = Query(default=None),
    limit: int = Query(default=120, ge=1, le=500),
    _: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    query = db.query(RideSearchEvent).order_by(RideSearchEvent.search_started_at.desc())
    if status:
        query = query.filter(RideSearchEvent.status == status.strip().lower())
    rows = query.limit(limit).all()
    out: list[dict] = []
    for row in rows:
        elapsed = max(0, int((datetime.utcnow() - (row.search_started_at or row.created_at)).total_seconds()))
        out.append(
            {
                "id": row.id,
                "user_id": row.user_id,
                "pickup_location": row.pickup_location,
                "drop_location": row.drop_location,
                "search_mode": row.search_mode,
                "vehicle_type": row.vehicle_type,
                "status": row.status,
                "assigned_driver_id": row.assigned_driver_id,
                "ride_id": row.ride_id,
                "search_started_at": row.search_started_at,
                "searched_seconds": row.searched_seconds or elapsed,
            }
        )
    return out


@router.patch("/search-monitor/{event_id}/assign-driver")
def assign_driver_to_search(
    event_id: str,
    payload: SearchAssignPayload,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> dict:
    row = db.get(RideSearchEvent, event_id)
    if not row:
        raise HTTPException(status_code=404, detail="Search event not found")
    driver = db.get(User, payload.driver_id)
    if not driver or driver.role != "driver":
        raise HTTPException(status_code=404, detail="Driver not found")
    row.assigned_driver_id = payload.driver_id
    row.status = "assigned"
    row.searched_seconds = max(0, int((datetime.utcnow() - (row.search_started_at or row.created_at)).total_seconds()))
    _audit(db, admin, "dispatch", f"manually assigned driver {payload.driver_id} for search {event_id}")
    db.commit()
    return {"ok": True}


@router.patch("/search-monitor/{event_id}/accept")
def accept_search(
    event_id: str,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> dict:
    row = db.get(RideSearchEvent, event_id)
    if not row:
        raise HTTPException(status_code=404, detail="Search event not found")
    row.status = "accepted"
    row.searched_seconds = max(0, int((datetime.utcnow() - (row.search_started_at or row.created_at)).total_seconds()))
    _audit(db, admin, "dispatch", f"accepted search {event_id}")
    db.commit()
    return {"ok": True}


@router.get("/dispatch-control")
def get_dispatch_control(
    _: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> dict:
    row = db.query(DispatchControl).order_by(DispatchControl.updated_at.desc()).first()
    if not row:
        row = DispatchControl(mode="auto", notes="System default")
        db.add(row)
        db.commit()
        db.refresh(row)
    return {"id": row.id, "mode": row.mode, "notes": row.notes, "updated_by": row.updated_by, "updated_at": row.updated_at}


@router.put("/dispatch-control")
def update_dispatch_control(
    payload: DispatchPayload,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> dict:
    row = db.query(DispatchControl).order_by(DispatchControl.updated_at.desc()).first()
    if not row:
        row = DispatchControl(mode=payload.mode)
        db.add(row)
    row.mode = payload.mode
    row.notes = payload.notes
    row.updated_by = admin.email
    _audit(db, admin, "dispatch", f"changed dispatch mode to {payload.mode}")
    db.commit()
    return {"ok": True}
