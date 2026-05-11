from datetime import datetime
from sqlalchemy.orm import Session
from .models import TrustLevel, FraudAnomalyLog

class FraudDetectionEngine:
    """
    Anti-Fraud system ensuring drivers cannot manipulate ratings or reliability.
    """
    def __init__(self, db: Session):
        self.db = db

    def evaluate_driver_fraud_risk(self, driver_id: str, recent_rides: list):
        """
        Runs weighted anomaly checks.
        """
        fake_cancels = 0
        rapid_completions = 0
        
        for ride in recent_rides:
            # Detect fake cancellations (cancelled without moving)
            if ride.status == "cancelled" and ride.distance_moved_km < 0.1:
                fake_cancels += 1
                
            # Detect fake completions (completed in suspicious time)
            if ride.status == "completed" and ride.duration_minutes < 2:
                rapid_completions += 1
                
        if fake_cancels > 3:
            self._log_anomaly(driver_id, "fake_cancel", "high", {"count": fake_cancels})
            self._apply_penalty(driver_id)
            
        if rapid_completions > 2:
            self._log_anomaly(driver_id, "rapid_completion", "critical", {"count": rapid_completions})
            self._apply_penalty(driver_id, freeze=True)

    def _log_anomaly(self, driver_id: str, type: str, severity: str, details: dict):
        log = FraudAnomalyLog(driver_id=driver_id, anomaly_type=type, severity=severity, details=details)
        self.db.add(log)
        self.db.commit()

    def _apply_penalty(self, driver_id: str, freeze: bool = False):
        level = self.db.query(TrustLevel).filter(TrustLevel.driver_id == driver_id).first()
        if level:
            level.fraud_flag = True
            level.tier = "Bronze" # Downgrade immediately
            if freeze:
                pass # Implementation to freeze account
            self.db.commit()
