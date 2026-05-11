from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
from datetime import datetime

class DistanceRequest(BaseModel):
    pickup_lat: float
    pickup_lng: float
    drop_lat: float
    drop_lng: float

class FareEstimateRequest(BaseModel):
    pickup_name: str
    drop_name: str
    vehicle_type: str
    mode: str = "instant" # instant, reserve
    distance_km: Optional[float] = None
    package_id: Optional[str] = None # for reserve

class FareBreakdown(BaseModel):
    base_fare: float
    distance_fare: float
    surge_multiplier: float
    night_charge: float
    total_estimated: float
    min_fare: float
    max_fare: float
    applied_logic: str # "Admin Route", "Distance Algorithm", "Reserve Package"

class PricingSlabItem(BaseModel):
    min_km: float
    max_km: float
    rate: float
    type: str # "fixed", "per_km"

class ServicePricingCreate(BaseModel):
    vehicle_type: str
    base_fare: float
    min_fare: float
    cancellation_fee: float = 0.0
    waiting_fee_per_min: float = 0.0
    slabs: List[PricingSlabItem]

class RoutePricingCreate(BaseModel):
    pickup_name: str
    drop_name: str
    vehicle_type: str
    fixed_fare: float
    min_fare: Optional[float] = None
    max_fare: Optional[float] = None

class DriverServiceModeUpdate(BaseModel):
    instant_on: Optional[bool] = None
    reserve_on: Optional[bool] = None
    bike_on: Optional[bool] = None
    auto_on: Optional[bool] = None
    car_on: Optional[bool] = None
