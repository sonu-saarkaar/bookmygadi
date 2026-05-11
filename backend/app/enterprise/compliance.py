from sqlalchemy.orm import Session
from fastapi import Request
from .models import UserConsent, AccountDeletionRequest

class PlayStoreComplianceEngine:
    def __init__(self, db: Session):
        self.db = db

    def record_consent(self, user_id: str, policy_type: str, version: str, request: Request, fingerprint: str):
        """
        Records an immutable consent log required by Google Play Store for background location.
        """
        ip_address = request.client.host if request.client else "unknown"
        consent = UserConsent(
            user_id=user_id,
            policy_type=policy_type,
            version=version,
            ip_address=ip_address,
            device_fingerprint=fingerprint
        )
        self.db.add(consent)
        self.db.commit()
        return consent

    def request_account_deletion(self, user_id: str):
        """
        Play Store Data Deletion Policy compliance.
        """
        existing = self.db.query(AccountDeletionRequest).filter(AccountDeletionRequest.user_id == user_id).first()
        if not existing:
            req = AccountDeletionRequest(user_id=user_id)
            self.db.add(req)
            self.db.commit()
            return req
        return existing
