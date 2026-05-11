from sqlalchemy.orm import Session
from .models import ProductionIncident
import logging

logger = logging.getLogger(__name__)

class IncidentResponseEngine:
    """
    Production outage and degradation detection.
    """
    def __init__(self, db: Session):
        self.db = db

    def report_anomaly(self, service: str, severity: str, description: str):
        incident = ProductionIncident(
            service=service,
            severity=severity,
            description=description
        )
        self.db.add(incident)
        self.db.commit()
        
        # Trigger Escalation (Slack/Telegram Integration)
        if severity in ["CRITICAL", "EMERGENCY"]:
            logger.critical(f"INCIDENT [{severity}] on {service}: {description}")
            # Escalation logic here
            
        return incident
