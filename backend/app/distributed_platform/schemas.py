from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime

class SessionCreateRequest(BaseModel):
    user_id: str
    device_id: str
    ip_address: str

class TokenRefreshRequest(BaseModel):
    refresh_token: str
    device_id: str

class ReplayEventRead(BaseModel):
    id: str
    ride_id: str
    event_type: str
    actor: str
    data: Dict[str, Any]
    timestamp: datetime

class AuditLogRequest(BaseModel):
    actor_id: str
    actor_role: str
    action_type: str
    target_id: str
    old_state: Optional[Dict[str, Any]] = None
    new_state: Optional[Dict[str, Any]] = None
    ip_address: str
