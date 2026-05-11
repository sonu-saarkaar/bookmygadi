from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db import Base
import uuid

# 1. DRIVER EARNINGS ENGINE
class DriverWallet(Base):
    __tablename__ = "driver_wallets"
    driver_id = Column(String, primary_key=True)
    balance = Column(Float, default=0.0)
    pending_settlement = Column(Float, default=0.0)
    total_earned = Column(Float, default=0.0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class EarningTransaction(Base):
    __tablename__ = "earning_transactions"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    driver_id = Column(String, index=True)
    ride_id = Column(String, nullable=True)
    amount = Column(Float, nullable=False)
    transaction_type = Column(String) # ride_fare, bonus, penalty, withdrawal, commission
    description = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

# 2. MATCHING ENGINE LOGS
class MatchingLog(Base):
    __tablename__ = "matching_logs"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    ride_id = Column(String, index=True)
    drivers_notified = Column(JSON) # List of driver IDs
    accepted_by = Column(String, nullable=True)
    matching_strategy = Column(String) # "nearest", "priority", "fallback"
    created_at = Column(DateTime, default=datetime.utcnow)

# 3. RESERVE SCHEDULING
class ReserveBooking(Base):
    __tablename__ = "reserve_bookings"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    customer_id = Column(String, index=True)
    driver_id = Column(String, index=True, nullable=True)
    vehicle_type = Column(String)
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    status = Column(String) # pending, confirmed, active, completed, cancelled
    booking_details = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

# 4. NEGOTIATION / BARGAINING
class FareNegotiation(Base):
    __tablename__ = "fare_negotiations"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    ride_id = Column(String, index=True)
    customer_id = Column(String)
    driver_id = Column(String)
    suggested_fare = Column(Float)
    latest_customer_offer = Column(Float, nullable=True)
    latest_driver_offer = Column(Float, nullable=True)
    status = Column(String) # open, accepted, expired, cancelled
    agreed_fare = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)

# 5. GEO ZONES
class GeoZone(Base):
    __tablename__ = "geo_zones"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String)
    zone_type = Column(String) # city, airport, station, village
    polygon_json = Column(JSON) # List of lat/lng coordinates
    base_multiplier = Column(Float, default=1.0)
    is_active = Column(Boolean, default=True)

# 6. DEMAND & HEATMAPS
class ZoneActivityStat(Base):
    __tablename__ = "zone_activity_stats"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    zone_id = Column(String, index=True)
    timestamp_hour = Column(DateTime, index=True)
    requests_count = Column(Integer, default=0)
    completed_count = Column(Integer, default=0)
    cancelled_count = Column(Integer, default=0)
    surge_multiplier_applied = Column(Float, default=1.0)

# 7. RELIABILITY SCORING
class DriverScore(Base):
    __tablename__ = "driver_scores"
    driver_id = Column(String, primary_key=True)
    reliability_score = Column(Float, default=100.0)
    acceptance_rate = Column(Float, default=100.0)
    cancellation_rate = Column(Float, default=0.0)
    rating = Column(Float, default=5.0)
    total_rides = Column(Integer, default=0)
    trust_badges = Column(JSON, default=list) # e.g. ["Punctual", "Safe"]

# 8. DISPUTE HANDLING
class RideDispute(Base):
    __tablename__ = "ride_disputes"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    ride_id = Column(String, index=True)
    raised_by_id = Column(String)
    raised_by_role = Column(String) # customer, driver
    dispute_type = Column(String) # overcharge, fake_cancel, misconduct
    description = Column(Text)
    status = Column(String) # open, under_review, resolved, closed
    resolution_details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
