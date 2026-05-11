from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, JSON, Text
from datetime import datetime
from app.db import Base
import uuid

# 1. PLAY STORE COMPLIANCE
class UserConsent(Base):
    __tablename__ = "user_consents"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, index=True)
    policy_type = Column(String) # privacy_policy, background_location, terms
    version = Column(String)
    ip_address = Column(String)
    device_fingerprint = Column(String)
    consented_at = Column(DateTime, default=datetime.utcnow)

class AccountDeletionRequest(Base):
    __tablename__ = "account_deletion_requests"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, index=True, unique=True)
    status = Column(String, default="pending") # pending, processed, rejected
    requested_at = Column(DateTime, default=datetime.utcnow)

# 2. OTP ABUSE PREVENTION
class DeviceFingerprint(Base):
    __tablename__ = "device_fingerprints"
    fingerprint = Column(String, primary_key=True)
    is_emulator = Column(Boolean, default=False)
    abuse_score = Column(Float, default=0.0)
    is_blocked = Column(Boolean, default=False)

class OTPRequestLog(Base):
    __tablename__ = "otp_request_logs"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    phone = Column(String, index=True)
    ip_address = Column(String, index=True)
    fingerprint = Column(String, index=True)
    is_successful = Column(Boolean)
    requested_at = Column(DateTime, default=datetime.utcnow)

# 3. GPS SPOOF DETECTION
class GPSAnomaly(Base):
    __tablename__ = "gps_anomalies"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    driver_id = Column(String, index=True)
    ride_id = Column(String, nullable=True)
    anomaly_type = Column(String) # mock_location, teleport, impossible_speed
    severity = Column(String) # low, medium, high, critical
    details = Column(JSON)
    detected_at = Column(DateTime, default=datetime.utcnow)

# 4. FINANCIAL PAYMENT LEDGER
class LedgerEntry(Base):
    __tablename__ = "ledger_entries"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    transaction_ref = Column(String, unique=True, index=True) # Ensure idempotency
    account_id = Column(String, index=True) # driver_id, rider_id, or "platform"
    account_type = Column(String) # driver_wallet, rider_wallet, platform_revenue
    amount = Column(Float, nullable=False) # Positive = credit, Negative = debit
    balance_after = Column(Float, nullable=False)
    description = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

# 5. EMERGENCY SOS SAFETY
class EmergencySession(Base):
    __tablename__ = "emergency_sessions"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    ride_id = Column(String, index=True)
    triggered_by = Column(String) # user_id
    lat = Column(Float)
    lng = Column(Float)
    status = Column(String, default="active") # active, resolved, false_alarm
    escalation_level = Column(Integer, default=1) # 1=Admin, 2=Contacts, 3=Police
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

# 6. DRIVER VERIFICATION (KYC)
class DriverVerification(Base):
    __tablename__ = "driver_verifications"
    driver_id = Column(String, primary_key=True)
    phone_verified = Column(Boolean, default=False)
    aadhaar_verified = Column(Boolean, default=False)
    dl_verified = Column(Boolean, default=False)
    face_match_score = Column(Float, nullable=True)
    kyc_status = Column(String, default="pending") # pending, approved, rejected, suspended
    rejection_reason = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
