from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from .models import SafeNegotiationSession

class SafeNegotiationEngine:
    """
    Structured bargaining system protecting against spam and chaotic negotiations.
    """
    def __init__(self, db: Session):
        self.db = db
        self.MAX_ATTEMPTS = 3
        self.TIMEOUT_MINUTES = 2

    def initiate_negotiation(self, ride_id: str, customer_id: str, base_fare: float):
        """
        Creates a locked negotiation session with calculated upper and lower bounds.
        """
        min_allowed = base_fare * 0.8  # Cannot bid 20% lower than suggested
        max_allowed = base_fare * 1.5  # Cannot bid 50% higher than suggested
        
        session = SafeNegotiationSession(
            ride_id=ride_id,
            customer_id=customer_id,
            base_suggested_fare=base_fare,
            min_allowed_fare=min_allowed,
            max_allowed_fare=max_allowed,
            expires_at=datetime.utcnow() + timedelta(minutes=self.TIMEOUT_MINUTES)
        )
        self.db.add(session)
        self.db.commit()
        return session

    def process_offer(self, ride_id: str, offer_amount: float) -> dict:
        """
        Validates an incoming offer against limits and attempts.
        """
        session = self.db.query(SafeNegotiationSession).filter(
            SafeNegotiationSession.ride_id == ride_id,
            SafeNegotiationSession.is_locked == False
        ).first()
        
        if not session:
            return {"status": "failed", "reason": "session_not_found_or_locked"}
            
        if datetime.utcnow() > session.expires_at:
            session.is_locked = True
            self.db.commit()
            return {"status": "failed", "reason": "expired"}
            
        if session.attempt_count >= self.MAX_ATTEMPTS:
            session.is_locked = True
            self.db.commit()
            return {"status": "failed", "reason": "max_attempts_reached"}
            
        if offer_amount < session.min_allowed_fare:
            return {"status": "rejected", "reason": f"Offer too low. Minimum is {session.min_allowed_fare}"}
            
        if offer_amount > session.max_allowed_fare:
            return {"status": "rejected", "reason": f"Offer too high. Maximum is {session.max_allowed_fare}"}
            
        session.attempt_count += 1
        self.db.commit()
        return {"status": "success", "amount": offer_amount, "attempts_remaining": self.MAX_ATTEMPTS - session.attempt_count}

    def lock_final_fare(self, ride_id: str):
        session = self.db.query(SafeNegotiationSession).filter(SafeNegotiationSession.ride_id == ride_id).first()
        if session:
            session.is_locked = True
            self.db.commit()
