from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Dict, Any
from .models import (
    DriverWallet, EarningTransaction, MatchingLog, FareNegotiation,
    DriverScore, ZoneActivityStat, GeoZone, RideDispute
)

class RideIntelligenceService:
    def __init__(self, db: Session):
        self.db = db

    # ==========================================
    # 1. EARNINGS ENGINE
    # ==========================================
    def process_ride_earning(self, driver_id: str, ride_id: str, amount: float, commission_rate: float = 0.1):
        wallet = self.db.query(DriverWallet).filter(DriverWallet.driver_id == driver_id).first()
        if not wallet:
            wallet = DriverWallet(driver_id=driver_id)
            self.db.add(wallet)
        
        commission = amount * commission_rate
        net_earning = amount - commission
        
        wallet.balance += net_earning
        wallet.total_earned += net_earning
        
        tx = EarningTransaction(
            driver_id=driver_id,
            ride_id=ride_id,
            amount=net_earning,
            transaction_type="ride_fare",
            description=f"Earnings for ride {ride_id}"
        )
        self.db.add(tx)
        
        tx_comm = EarningTransaction(
            driver_id=driver_id,
            ride_id=ride_id,
            amount=-commission,
            transaction_type="commission",
            description=f"Platform commission for ride {ride_id}"
        )
        self.db.add(tx_comm)
        self.db.commit()

    # ==========================================
    # 2. MATCHING ENGINE
    # ==========================================
    def score_drivers_for_dispatch(self, pickup_lat: float, pickup_lng: float, vehicle_type: str) -> List[str]:
        """
        Intelligent scoring incorporating reliability, proximity, and acceptance rates.
        Returns ordered list of best driver IDs.
        """
        # In a real scenario, we query live Redis locations + PostgreSQL scores.
        # This simulates pulling available drivers and ranking them.
        drivers = self.db.query(DriverScore).filter(DriverScore.reliability_score > 50).all()
        
        # Sort by reliability score descending (simplified intelligent match)
        ranked = sorted(drivers, key=lambda d: d.reliability_score, reverse=True)
        return [d.driver_id for d in ranked][:10]

    def log_dispatch(self, ride_id: str, drivers: List[str], strategy: str):
        log = MatchingLog(ride_id=ride_id, drivers_notified=drivers, matching_strategy=strategy)
        self.db.add(log)
        self.db.commit()

    # ==========================================
    # 3. RELIABILITY SCORING
    # ==========================================
    def update_driver_score(self, driver_id: str, action: str):
        """Action: 'accept', 'cancel', 'complete'"""
        score = self.db.query(DriverScore).filter(DriverScore.driver_id == driver_id).first()
        if not score:
            score = DriverScore(driver_id=driver_id)
            self.db.add(score)
            
        if action == "accept":
            score.reliability_score = min(100.0, score.reliability_score + 0.5)
        elif action == "cancel":
            score.reliability_score = max(0.0, score.reliability_score - 5.0)
            score.cancellation_rate += 1.0 # In real implementation, recalculate %
        elif action == "complete":
            score.reliability_score = min(100.0, score.reliability_score + 1.0)
            score.total_rides += 1
            
        if score.reliability_score >= 95 and score.total_rides > 50:
            if "Elite" not in score.trust_badges:
                badges = list(score.trust_badges)
                badges.append("Elite")
                score.trust_badges = badges
                
        self.db.commit()

    # ==========================================
    # 4. BARGAINING / NEGOTIATION
    # ==========================================
    def create_negotiation(self, ride_id: str, customer_id: str, suggested: float) -> FareNegotiation:
        neg = FareNegotiation(
            ride_id=ride_id,
            customer_id=customer_id,
            driver_id="pending",
            suggested_fare=suggested,
            status="open",
            expires_at=datetime.utcnow() + timedelta(minutes=5)
        )
        self.db.add(neg)
        self.db.commit()
        return neg

    # ==========================================
    # 5. DISPUTE HANDLING
    # ==========================================
    def create_dispute(self, ride_id: str, user_id: str, role: str, type: str, desc: str):
        d = RideDispute(
            ride_id=ride_id, raised_by_id=user_id, raised_by_role=role,
            dispute_type=type, description=desc, status="open"
        )
        self.db.add(d)
        self.db.commit()
        return d
