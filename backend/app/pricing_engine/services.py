from sqlalchemy.orm import Session
from datetime import datetime
import re
from .models import RoutePricing, ServicePricing, SurgeRule, ReservePackage, RideFareLog
from .schemas import FareEstimateRequest, FareBreakdown

class PricingEngine:
    def __init__(self, db: Session):
        self.db = db

    def calculate_fare(self, request: FareEstimateRequest) -> FareBreakdown:
        if request.mode == "reserve" and request.package_id:
            return self._calculate_reserve_fare(request)
        
        # 1. Check exact Route Pricing (Admin Defined)
        route_pricing = self.db.query(RoutePricing).filter(
            RoutePricing.pickup_name.ilike(f"%{request.pickup_name}%"),
            RoutePricing.drop_name.ilike(f"%{request.drop_name}%"),
            RoutePricing.vehicle_type == request.vehicle_type,
            RoutePricing.is_active == True
        ).first()

        if route_pricing:
            return FareBreakdown(
                base_fare=route_pricing.fixed_fare,
                distance_fare=0,
                surge_multiplier=1.0,
                night_charge=0,
                total_estimated=route_pricing.fixed_fare,
                min_fare=route_pricing.min_fare or route_pricing.fixed_fare * 0.9,
                max_fare=route_pricing.max_fare or route_pricing.fixed_fare * 1.1,
                applied_logic="Admin Route Match"
            )

        # 2. Fallback to Dynamic Slab Pricing
        return self._calculate_dynamic_fare(request)

    def _calculate_dynamic_fare(self, request: FareEstimateRequest) -> FareBreakdown:
        service = self.db.query(ServicePricing).filter(
            ServicePricing.vehicle_type == request.vehicle_type,
            ServicePricing.is_active == True
        ).first()

        if not service:
            # Fallback default if not configured
            service = ServicePricing(
                base_fare=30, min_fare=35,
                slabs_json=[{"min_km": 0, "max_km": 999, "rate": 8, "type": "per_km"}]
            )

        distance = request.distance_km or 0.0
        distance_fare = 0.0
        
        for slab in service.slabs_json:
            min_km = slab.get("min_km", 0)
            max_km = slab.get("max_km", 999)
            rate = slab.get("rate", 0)
            stype = slab.get("type", "per_km")

            if distance > min_km:
                applicable_km = min(distance, max_km) - min_km
                if stype == "fixed":
                    distance_fare += rate # If it's a fixed slab (e.g. 0-2km is flat 25)
                else:
                    distance_fare += applicable_km * rate

        # Adjust for Night Charge (10 PM to 5 AM)
        current_hour = datetime.utcnow().hour
        # UTC to IST approx +5:30 -> (current_hour + 5) % 24
        ist_hour = (current_hour + 5) % 24
        night_charge = 0
        if 22 <= ist_hour or ist_hour <= 5:
            night_charge = (service.base_fare + distance_fare) * 0.15 # 15% night charge

        # Check Surges
        surge = self.db.query(SurgeRule).filter(
            SurgeRule.is_active == True,
            SurgeRule.vehicle_type.in_([request.vehicle_type, None]),
            SurgeRule.start_hour <= ist_hour,
            SurgeRule.end_hour >= ist_hour
        ).first()

        surge_multiplier = surge.multiplier if surge else 1.0

        total = (service.base_fare + distance_fare + night_charge) * surge_multiplier
        total = max(total, service.min_fare)

        return FareBreakdown(
            base_fare=service.base_fare,
            distance_fare=distance_fare,
            surge_multiplier=surge_multiplier,
            night_charge=night_charge,
            total_estimated=round(total, 2),
            min_fare=round(total * 0.9, 2),
            max_fare=round(total * 1.15, 2),
            applied_logic="Distance Algorithm"
        )

    def _calculate_reserve_fare(self, request: FareEstimateRequest) -> FareBreakdown:
        package = self.db.query(ReservePackage).filter(
            ReservePackage.id == request.package_id,
            ReservePackage.is_active == True
        ).first()

        if not package:
            raise ValueError("Reserve package not found")

        total = package.base_price
        
        return FareBreakdown(
            base_fare=package.base_price,
            distance_fare=0.0,
            surge_multiplier=1.0,
            night_charge=0.0,
            total_estimated=total,
            min_fare=total,
            max_fare=total * 1.1,
            applied_logic="Reserve Package"
        )

    def log_fare(self, ride_id: str, breakdown: FareBreakdown):
        log = RideFareLog(
            ride_id=ride_id,
            calculated_fare=breakdown.total_estimated,
            applied_rule_type=breakdown.applied_logic,
            calculation_json=breakdown.model_dump()
        )
        self.db.add(log)
        self.db.commit()
