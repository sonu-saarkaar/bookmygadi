from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class NegotiationOffer(BaseModel):
    ride_id: str
    amount: float
    offered_by: str # "customer" or "driver"

class DisputeCreate(BaseModel):
    ride_id: str
    dispute_type: str
    description: str

class GeoZoneCreate(BaseModel):
    name: str
    zone_type: str
    polygon_json: List[Dict[str, float]] # e.g. [{"lat": 26.1, "lng": 85.3}]
    base_multiplier: float = 1.0

class EarningTransactionRead(BaseModel):
    id: str
    amount: float
    transaction_type: str
    description: str
    created_at: datetime

class DriverScoreRead(BaseModel):
    driver_id: str
    reliability_score: float
    acceptance_rate: float
    cancellation_rate: float
    rating: float
    trust_badges: List[str]

class FareSimulationRequest(BaseModel):
    pickup_lat: float
    pickup_lng: float
    drop_lat: float
    drop_lng: float
    vehicle_type: str
    time_of_day: str # "morning", "night", "peak"
