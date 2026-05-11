from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import secrets
import hashlib
from .models import UserSession

class PersistentSessionEngine:
    """
    Enterprise Auth Session Engine ensuring users/drivers are never randomly logged out.
    Behaves exactly like Rapido/Uber persistent device-bound sessions.
    """
    def __init__(self, db: Session):
        self.db = db
        self.REFRESH_EXPIRY_DAYS = 90 # 3 months persistence

    def create_session(self, user_id: str, device_id: str, ip_address: str) -> str:
        # Generate secure refresh token
        raw_token = secrets.token_urlsafe(64)
        hashed_token = hashlib.sha256(raw_token.encode()).hexdigest()

        # Invalidate old session for this exact device to prevent token buildup
        self.db.query(UserSession).filter(
            UserSession.user_id == user_id, 
            UserSession.device_id == device_id
        ).update({"is_revoked": True})

        session = UserSession(
            user_id=user_id,
            device_id=device_id,
            refresh_token=hashed_token,
            ip_address=ip_address,
            expires_at=datetime.utcnow() + timedelta(days=self.REFRESH_EXPIRY_DAYS)
        )
        self.db.add(session)
        self.db.commit()
        return raw_token # Return raw token ONLY ONCE

    def rotate_refresh_token(self, raw_refresh_token: str, device_id: str) -> dict:
        """
        Silent background refresh. Validates device binding to prevent token theft.
        """
        hashed_token = hashlib.sha256(raw_refresh_token.encode()).hexdigest()
        session = self.db.query(UserSession).filter(
            UserSession.refresh_token == hashed_token,
            UserSession.is_revoked == False
        ).first()

        if not session:
            return {"status": "unauthorized", "reason": "Invalid or revoked token"}
            
        if session.expires_at < datetime.utcnow():
            session.is_revoked = True
            self.db.commit()
            return {"status": "unauthorized", "reason": "Token expired"}

        if session.device_id != device_id:
            # Huge red flag: Token stolen and used on another device. Revoke immediately.
            session.is_revoked = True
            self.db.commit()
            # Here we would also trigger a ForensicAuditLog
            return {"status": "unauthorized", "reason": "Device mismatch anomaly"}

        # Issue new token (Rotation)
        new_raw_token = secrets.token_urlsafe(64)
        session.refresh_token = hashlib.sha256(new_raw_token.encode()).hexdigest()
        session.last_active_at = datetime.utcnow()
        session.expires_at = datetime.utcnow() + timedelta(days=self.REFRESH_EXPIRY_DAYS)
        self.db.commit()

        # In a real app, generate the short-lived JWT Access Token here
        dummy_access_token = "eyJhbGciOiJIUzI1NiIsInR5c..." 
        
        return {
            "status": "success",
            "access_token": dummy_access_token,
            "refresh_token": new_raw_token
        }
