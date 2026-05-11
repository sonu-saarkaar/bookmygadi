from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db

from .schemas import ConsentRecordRequest, LocationAnomalyReport, SOSTriggerRequest, LedgerTransactionRequest
from .compliance import PlayStoreComplianceEngine
from .security import EnterpriseSecurityEngine
from .safety import SafetyEngine
from .ledger import ImmutableLedgerEngine

router = APIRouter(tags=["enterprise_operations"])

# ----- COMPLIANCE -----
@router.post("/compliance/consent")
def record_consent(payload: ConsentRecordRequest, request: Request, db: Session = Depends(get_db)):
    engine = PlayStoreComplianceEngine(db)
    # Using 'anonymous' for now, replace with JWT extract
    consent = engine.record_consent("test_user", payload.policy_type, payload.version, request, payload.device_fingerprint)
    return {"status": "success", "consent_id": consent.id}

@router.post("/compliance/delete-account")
def request_account_deletion(user_id: str, db: Session = Depends(get_db)):
    engine = PlayStoreComplianceEngine(db)
    engine.request_account_deletion(user_id)
    return {"status": "success", "message": "Deletion request queued as per Play Store policy."}

# ----- SECURITY -----
@router.post("/security/location-anomaly")
def report_location_anomaly(payload: LocationAnomalyReport, db: Session = Depends(get_db)):
    engine = EnterpriseSecurityEngine(db)
    # user_id should come from auth
    engine.analyze_location_integrity("test_driver", payload.ride_id, payload.lat, payload.lng, payload.accuracy, payload.speed_kmh, payload.is_mocked)
    return {"status": "processed"}

# ----- SAFETY -----
@router.post("/safety/sos")
def trigger_sos(payload: SOSTriggerRequest, db: Session = Depends(get_db)):
    engine = SafetyEngine(db)
    session = engine.trigger_sos(payload.ride_id, "test_user", payload.lat, payload.lng, payload.reason)
    return {"status": "emergency_triggered", "session_id": session.id}

# ----- FINANCIAL LEDGER -----
@router.post("/ledger/transaction")
def process_ledger_transaction(payload: LedgerTransactionRequest, db: Session = Depends(get_db)):
    engine = ImmutableLedgerEngine(db)
    entry = engine.record_transaction(
        ref=payload.transaction_ref, account_id=payload.account_id, 
        account_type=payload.account_type, amount=payload.amount, 
        description=payload.description
    )
    return {"status": "success", "new_balance": entry.balance_after}
