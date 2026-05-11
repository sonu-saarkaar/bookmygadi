from sqlalchemy.orm import Session
from sqlalchemy import func
from .models import LedgerEntry
from fastapi import HTTPException

class ImmutableLedgerEngine:
    def __init__(self, db: Session):
        self.db = db

    def record_transaction(self, ref: str, account_id: str, account_type: str, amount: float, description: str):
        """
        Implements double-entry-like immutable ledger. 
        NEVER UPDATE a balance directly. ALWAYS append a ledger entry and calculate the sum.
        """
        # Idempotency check to prevent double charging
        existing = self.db.query(LedgerEntry).filter(LedgerEntry.transaction_ref == ref).first()
        if existing:
            return existing

        # Calculate current balance from ledger sum
        current_balance = self.db.query(func.sum(LedgerEntry.amount)).filter(
            LedgerEntry.account_id == account_id
        ).scalar() or 0.0

        new_balance = current_balance + amount
        
        entry = LedgerEntry(
            transaction_ref=ref,
            account_id=account_id,
            account_type=account_type,
            amount=amount,
            balance_after=new_balance,
            description=description
        )
        self.db.add(entry)
        self.db.commit()
        return entry

    def get_wallet_balance(self, account_id: str) -> float:
        """
        Always calculates the real balance from the ledger, making financial mismatches mathematically impossible.
        """
        return self.db.query(func.sum(LedgerEntry.amount)).filter(
            LedgerEntry.account_id == account_id
        ).scalar() or 0.0
