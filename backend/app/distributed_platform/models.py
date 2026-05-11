from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, JSON, Text, ForeignKey
from datetime import datetime
from app.db import Base
import uuid

# 1. PERSISTENT SESSIONS (Uber/Rapido style)
class UserSession(Base):
    __tablename__ = "user_sessions"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, index=True)
    device_id = Column(String, index=True) # Unique hardware identifier
    refresh_token = Column(String, unique=True, index=True)
    ip_address = Column(String)
    is_revoked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)
    last_active_at = Column(DateTime, default=datetime.utcnow)

# 2. DISTRIBUTED EVENT BUS LOGS
class DistributedEventLog(Base):
    __tablename__ = "distributed_event_logs"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    event_type = Column(String, index=True) # RideCreated, PaymentFailed, SOSTriggered
    payload = Column(JSON)
    published_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="pending") # pending, processed, failed

# 3. INCIDENT RESPONSE SYSTEM
class ProductionIncident(Base):
    __tablename__ = "production_incidents"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    severity = Column(String) # INFO, WARNING, CRITICAL, EMERGENCY
    service = Column(String) # postgres, redis, websocket, api
    description = Column(String)
    status = Column(String, default="open") # open, investigating, resolved
    detected_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

# 4. RIDE REPLAY SYSTEM
class RideReplayEvent(Base):
    __tablename__ = "ride_replay_events"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    ride_id = Column(String, index=True)
    event_type = Column(String) # location_update, status_change, chat_message
    actor = Column(String) # driver, customer, system
    data = Column(JSON)
    timestamp = Column(DateTime, default=datetime.utcnow)

# 5. FRAUD INTELLIGENCE
class DriverFraudScore(Base):
    __tablename__ = "driver_fraud_scores"
    driver_id = Column(String, primary_key=True)
    risk_score = Column(Float, default=0.0) # 0.0 to 100.0 (High is bad)
    detected_patterns = Column(JSON) # e.g. ["gps_spoof", "fake_cancellations"]
    last_calculated_at = Column(DateTime, default=datetime.utcnow)

# 6. CENTRALIZED FORENSIC AUDIT
class ForensicAuditLog(Base):
    __tablename__ = "forensic_audit_logs"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    actor_id = Column(String, index=True)
    actor_role = Column(String) # admin, system
    action_type = Column(String) # manual_refund, wallet_override, driver_suspension
    target_id = Column(String) # ride_id, driver_id
    old_state = Column(JSON, nullable=True)
    new_state = Column(JSON, nullable=True)
    ip_address = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
