from sqlalchemy.orm import Session
from .models import EmergencySession
import logging

logger = logging.getLogger(__name__)

class SafetyEngine:
    def __init__(self, db: Session):
        self.db = db

    def trigger_sos(self, ride_id: str, user_id: str, lat: float, lng: float, reason: str = None):
        """
        Creates an Emergency SOS Session.
        In a live environment, this connects to WebSockets to alert Admins instantly.
        """
        session = EmergencySession(
            ride_id=ride_id,
            triggered_by=user_id,
            lat=lat,
            lng=lng
        )
        self.db.add(session)
        self.db.commit()
        
        logger.critical(f"SOS TRIGGERED! Ride: {ride_id} User: {user_id} Lat/Lng: {lat}/{lng}")
        # Here we would invoke SMS gateway / Push notification to trusted contacts
        return session

    def resolve_sos(self, session_id: str, admin_id: str):
        session = self.db.query(EmergencySession).filter(EmergencySession.id == session_id).first()
        if session:
            session.status = "resolved"
            self.db.commit()
