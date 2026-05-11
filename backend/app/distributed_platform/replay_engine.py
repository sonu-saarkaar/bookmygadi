from sqlalchemy.orm import Session
from .models import RideReplayEvent

class RideReplayEngine:
    """
    Live Ride Replay Infrastructure.
    Captures every event for dispute investigation and fraud analysis.
    """
    def __init__(self, db: Session):
        self.db = db

    def capture_event(self, ride_id: str, event_type: str, actor: str, data: dict):
        event = RideReplayEvent(
            ride_id=ride_id,
            event_type=event_type,
            actor=actor,
            data=data
        )
        self.db.add(event)
        self.db.commit()

    def fetch_timeline(self, ride_id: str):
        """
        Reconstructs the entire ride timeline for Admin playback.
        """
        events = self.db.query(RideReplayEvent).filter(
            RideReplayEvent.ride_id == ride_id
        ).order_by(RideReplayEvent.timestamp.asc()).all()
        return events
