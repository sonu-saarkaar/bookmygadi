from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.db import get_db

from .schemas import DisputeCreate, NegotiationOffer, DriverScoreRead, EarningTransactionRead
from .services import RideIntelligenceService
from .models import DriverScore, DriverWallet, EarningTransaction

router = APIRouter(tags=["ride_intelligence"])

@router.get("/driver/{driver_id}/earnings", response_model=list[EarningTransactionRead])
def get_driver_earnings(driver_id: str, db: Session = Depends(get_db)):
    txs = db.query(EarningTransaction).filter(EarningTransaction.driver_id == driver_id).order_by(EarningTransaction.created_at.desc()).limit(50).all()
    return txs

@router.get("/driver/{driver_id}/score", response_model=DriverScoreRead)
def get_driver_score(driver_id: str, db: Session = Depends(get_db)):
    score = db.query(DriverScore).filter(DriverScore.driver_id == driver_id).first()
    if not score:
        raise HTTPException(status_code=404, detail="Score not found")
    return score

@router.post("/disputes")
def create_ride_dispute(payload: DisputeCreate, db: Session = Depends(get_db)):
    service = RideIntelligenceService(db)
    # user_id should come from auth token in production
    dispute = service.create_dispute(payload.ride_id, "test_user", "customer", payload.dispute_type, payload.description)
    return {"message": "Dispute created", "dispute_id": dispute.id}

@router.post("/negotiate")
def negotiate_fare(payload: NegotiationOffer, db: Session = Depends(get_db)):
    service = RideIntelligenceService(db)
    if payload.offered_by == "customer":
        neg = service.create_negotiation(payload.ride_id, "test_user", payload.amount)
        # Notify drivers via websockets (implemented in websockets.py / background tasks)
        return {"message": "Offer broadcasted to nearby drivers", "id": neg.id}
    return {"message": "Negotiation logic handled via realtime sockets"}
