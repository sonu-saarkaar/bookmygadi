from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File
from sqlalchemy.orm import Session
import pandas as pd
from io import BytesIO

from app.db import get_db
from app.api.common.deps import get_admin_user, get_current_user
from .schemas import FareEstimateRequest, FareBreakdown, ServicePricingCreate, RoutePricingCreate, DriverServiceModeUpdate
from .models import ServicePricing, RoutePricing, DriverServiceMode
from .services import PricingEngine

router = APIRouter(tags=["pricing_engine"])

@router.post("/estimate", response_model=FareBreakdown)
def estimate_fare(
    request: FareEstimateRequest,
    db: Session = Depends(get_db)
):
    engine = PricingEngine(db)
    try:
        breakdown = engine.calculate_fare(request)
        return breakdown
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/admin/services", summary="Define Distance Pricing Slabs")
def create_service_pricing(
    payload: ServicePricingCreate,
    db: Session = Depends(get_db),
    # _: User = Depends(get_admin_user)
):
    service = db.query(ServicePricing).filter(ServicePricing.vehicle_type == payload.vehicle_type).first()
    if not service:
        service = ServicePricing(vehicle_type=payload.vehicle_type)
        db.add(service)
    
    service.base_fare = payload.base_fare
    service.min_fare = payload.min_fare
    service.cancellation_fee = payload.cancellation_fee
    service.waiting_fee_per_min = payload.waiting_fee_per_min
    service.slabs_json = [s.model_dump() for s in payload.slabs]
    
    db.commit()
    return {"message": "Service pricing updated"}


@router.post("/admin/routes", summary="Define Fixed Route Pricing")
def create_route_pricing(
    payload: RoutePricingCreate,
    db: Session = Depends(get_db),
    # _: User = Depends(get_admin_user)
):
    route = RoutePricing(**payload.model_dump())
    db.add(route)
    db.commit()
    return {"message": "Route pricing created successfully", "id": route.id}


@router.post("/admin/routes/import", summary="Bulk Import Route Pricing via Excel")
async def import_route_pricing(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    # _: User = Depends(get_admin_user)
):
    contents = await file.read()
    df = pd.read_excel(BytesIO(contents))
    
    imported = 0
    for _, row in df.iterrows():
        rp = RoutePricing(
            pickup_name=str(row.get('Pickup', '')),
            drop_name=str(row.get('Drop', '')),
            vehicle_type=str(row.get('VehicleType', 'bike')).lower(),
            fixed_fare=float(row.get('FixedFare', 0)),
            min_fare=float(row.get('MinFare', 0)) if pd.notna(row.get('MinFare')) else None,
            max_fare=float(row.get('MaxFare', 0)) if pd.notna(row.get('MaxFare')) else None
        )
        db.add(rp)
        imported += 1
    
    db.commit()
    return {"message": f"Successfully imported {imported} routes"}


@router.patch("/driver/service-modes", summary="Driver toggles for modes/services")
def update_driver_service_modes(
    payload: DriverServiceModeUpdate,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user) # Assuming rider/driver logic
):
    driver_id = "test_driver" # Replace with current_user.id
    mode = db.query(DriverServiceMode).filter(DriverServiceMode.driver_id == driver_id).first()
    if not mode:
        mode = DriverServiceMode(driver_id=driver_id)
        db.add(mode)
    
    updates = payload.model_dump(exclude_unset=True)
    for k, v in updates.items():
        setattr(mode, k, v)
        
    db.commit()
    return {"message": "Service modes updated"}
