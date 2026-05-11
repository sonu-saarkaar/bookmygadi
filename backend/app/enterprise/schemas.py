from pydantic import BaseModel
from typing import Optional, Dict, Any

class ConsentRecordRequest(BaseModel):
    policy_type: str
    version: str
    device_fingerprint: str

class LocationAnomalyReport(BaseModel):
    ride_id: Optional[str] = None
    lat: float
    lng: float
    accuracy: float
    is_mocked: bool
    speed_kmh: float

class SOSTriggerRequest(BaseModel):
    ride_id: str
    lat: float
    lng: float
    reason: Optional[str] = None

class LedgerTransactionRequest(BaseModel):
    transaction_ref: str
    account_id: str
    account_type: str
    amount: float
    description: str
