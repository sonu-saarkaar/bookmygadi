from sqlalchemy.orm import Session
from .models import ForensicAuditLog

class ForensicAuditEngine:
    """
    Centralized Forensic Auditing.
    Immutable tracking of all critical manual actions.
    """
    def __init__(self, db: Session):
        self.db = db

    def log_action(self, actor_id: str, actor_role: str, action_type: str, target_id: str, ip_address: str, old_state: dict = None, new_state: dict = None):
        log = ForensicAuditLog(
            actor_id=actor_id,
            actor_role=actor_role,
            action_type=action_type,
            target_id=target_id,
            old_state=old_state,
            new_state=new_state,
            ip_address=ip_address
        )
        self.db.add(log)
        self.db.commit()
        return log
