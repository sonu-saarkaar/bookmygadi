from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.db import get_db

from .schemas import SessionCreateRequest, TokenRefreshRequest, AuditLogRequest
from .auth_sessions import PersistentSessionEngine
from .replay_engine import RideReplayEngine
from .audit_forensics import ForensicAuditEngine

router = APIRouter(tags=["distributed_platform"])

# ----- PERSISTENT SESSIONS -----
@router.post("/auth/session")
def create_persistent_session(payload: SessionCreateRequest, db: Session = Depends(get_db)):
    engine = PersistentSessionEngine(db)
    refresh_token = engine.create_session(payload.user_id, payload.device_id, payload.ip_address)
    return {"status": "success", "refresh_token": refresh_token}

@router.post("/auth/refresh")
def rotate_refresh_token(payload: TokenRefreshRequest, db: Session = Depends(get_db)):
    engine = PersistentSessionEngine(db)
    result = engine.rotate_refresh_token(payload.refresh_token, payload.device_id)
    return result

# ----- RIDE REPLAY -----
@router.get("/replay/{ride_id}")
def fetch_ride_replay(ride_id: str, db: Session = Depends(get_db)):
    engine = RideReplayEngine(db)
    timeline = engine.fetch_timeline(ride_id)
    return {"ride_id": ride_id, "timeline": timeline}

# ----- FORENSICS -----
@router.post("/audit")
def create_audit_log(payload: AuditLogRequest, db: Session = Depends(get_db)):
    engine = ForensicAuditEngine(db)
    log = engine.log_action(
        actor_id=payload.actor_id, actor_role=payload.actor_role, 
        action_type=payload.action_type, target_id=payload.target_id, 
        ip_address=payload.ip_address, old_state=payload.old_state, 
        new_state=payload.new_state
    )
    return {"status": "success", "audit_id": log.id}
