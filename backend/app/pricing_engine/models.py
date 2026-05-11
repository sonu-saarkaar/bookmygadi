from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db import Base
import uuid

class PricingZone(Base):
    __tablename__ = "pricing_zones"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, index=True, nullable=False)
    city = Column(String, index=True, nullable=False)
    center_lat = Column(Float, nullable=True)
    center_lng = Column(Float, nullable=True)
    radius_km = Column(Float, default=5.0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class RoutePricing(Base):
    __tablename__ = "route_pricing"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    pickup_name = Column(String, index=True, nullable=False)
    drop_name = Column(String, index=True, nullable=False)
    vehicle_type = Column(String, nullable=False) # bike, auto, car
    fixed_fare = Column(Float, nullable=False)
    min_fare = Column(Float, nullable=True)
    max_fare = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ServicePricing(Base):
    __tablename__ = "service_pricing"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    vehicle_type = Column(String, unique=True, nullable=False) # bike, auto, car
    base_fare = Column(Float, nullable=False)
    min_fare = Column(Float, nullable=False)
    cancellation_fee = Column(Float, default=0.0)
    waiting_fee_per_min = Column(Float, default=0.0)
    slabs_json = Column(JSON, nullable=False) # [{"min_km": 0, "max_km": 2, "rate": 30, "type": "fixed_or_per_km"}]
    is_active = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class SurgeRule(Base):
    __tablename__ = "surge_rules"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    vehicle_type = Column(String, nullable=True) # null applies to all
    start_hour = Column(Integer, nullable=True) # 0-23
    end_hour = Column(Integer, nullable=True)
    multiplier = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True)

class ReservePackage(Base):
    __tablename__ = "reserve_packages"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False) # Wedding, Outstation, Full Day
    vehicle_type = Column(String, nullable=False)
    min_hours = Column(Integer, nullable=False)
    included_km = Column(Float, nullable=False)
    base_price = Column(Float, nullable=False)
    extra_km_charge = Column(Float, nullable=False)
    extra_hour_charge = Column(Float, nullable=False)
    driver_allowance = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)

class DriverServiceMode(Base):
    __tablename__ = "driver_service_modes"
    driver_id = Column(String, primary_key=True)
    instant_on = Column(Boolean, default=True)
    reserve_on = Column(Boolean, default=True)
    bike_on = Column(Boolean, default=False)
    auto_on = Column(Boolean, default=False)
    car_on = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class RideFareLog(Base):
    __tablename__ = "ride_fare_logs"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    ride_id = Column(String, nullable=True, index=True)
    calculated_fare = Column(Float, nullable=False)
    applied_rule_type = Column(String, nullable=False) # route, algorithm, history
    calculation_json = Column(JSON, nullable=False) # detail breakdown
    created_at = Column(DateTime, default=datetime.utcnow)
