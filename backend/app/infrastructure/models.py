from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db import Base
import uuid

# 1. GEO-ZONE SYSTEM (Polygon support)
class AdvancedGeoZone(Base):
    __tablename__ = "advanced_geo_zones"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, index=True)
    zone_type = Column(String, index=True) # surge, event, market, city, village
    priority = Column(Integer, default=0) # Higher wins on overlap
    polygon_geojson = Column(JSON) # Standard GeoJSON for PostGIS compatibility
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# 2. FRAUD-RESISTANT RELIABILITY
class TrustLevel(Base):
    __tablename__ = "trust_levels"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    driver_id = Column(String, index=True, unique=True)
    tier = Column(String, default="Bronze") # Bronze, Silver, Gold, Elite
    fraud_flag = Column(Boolean, default=False)
    fake_cancel_count = Column(Integer, default=0)
    gps_anomaly_count = Column(Integer, default=0)
    last_anomaly_detected_at = Column(DateTime, nullable=True)

class FraudAnomalyLog(Base):
    __tablename__ = "fraud_anomaly_logs"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    driver_id = Column(String, index=True)
    anomaly_type = Column(String) # fake_gps, rapid_cancel, spam_negotiation
    severity = Column(String) # low, medium, high, critical
    details = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

# 3. SAFE NEGOTIATION
class SafeNegotiationSession(Base):
    __tablename__ = "safe_negotiation_sessions"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    ride_id = Column(String, index=True, unique=True)
    customer_id = Column(String)
    base_suggested_fare = Column(Float)
    min_allowed_fare = Column(Float)
    max_allowed_fare = Column(Float)
    attempt_count = Column(Integer, default=0)
    is_locked = Column(Boolean, default=False)
    expires_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

# 4. ADVANCED DISPATCH
class DispatchScoringLog(Base):
    __tablename__ = "dispatch_scoring_logs"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    ride_id = Column(String, index=True)
    driver_id = Column(String)
    distance_score = Column(Float)
    reliability_score = Column(Float)
    direction_score = Column(Float)
    final_weight = Column(Float)
    dispatched_at = Column(DateTime, default=datetime.utcnow)
    accepted = Column(Boolean, default=False)

# 5. WEBSOCKET DISTRIBUTED LOGS
class WebsocketConnectionLog(Base):
    __tablename__ = "websocket_connection_logs"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, index=True)
    node_id = Column(String) # Tracks which pod/instance handled the connection
    connected_at = Column(DateTime, default=datetime.utcnow)
    disconnected_at = Column(DateTime, nullable=True)
    disconnect_reason = Column(String, nullable=True)
