from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app.api.deps import get_admin_user
from app.models import User, ServiceMetadata
from app.schemas import ServiceMetadataCreate, ServiceMetadataUpdate, ServiceMetadataRead

router = APIRouter(prefix="/services", tags=["services"])


def _default_services() -> list[dict]:
    return [
        {
            "title": "Instant Ride Car",
            "description": "Comfortable city and outstation trips",
            "vehicle_type": "car",
            "service_mode": "Instant Ride",
            "vehicle_model": "Swift",
            "icon_name": "Car",
            "tag_highlight": "Best Value",
            "color_scheme": "from-emerald-400 to-emerald-600",
            "display_order": 1,
            "is_active": True,
        },
        {
            "title": "Bike Ride",
            "description": "Fast and affordable commute for solo travellers",
            "vehicle_type": "bike",
            "service_mode": "Instant Ride",
            "vehicle_model": "Bike",
            "icon_name": "Bike",
            "tag_highlight": "Popular",
            "color_scheme": "from-amber-400 to-orange-500",
            "display_order": 2,
            "is_active": True,
        },
        {
            "title": "Auto Ride",
            "description": "Economical 3-Wheeler and E-Rikhsaw for local markets",
            "vehicle_type": "auto",
            "service_mode": "Instant Ride",
            "vehicle_model": "Auto",
            "icon_name": "Navigation",
            "tag_highlight": "Eco-friendly",
            "color_scheme": "from-teal-400 to-teal-600",
            "display_order": 3,
            "is_active": True,
        },
        {
            "title": "Mini Pickup",
            "description": "Light goods delivery within the city limits",
            "vehicle_type": "bolero",
            "service_mode": "Instant Ride",
            "vehicle_model": "Pickup",
            "icon_name": "Truck",
            "tag_highlight": "Fast Delivery",
            "color_scheme": "from-cyan-500 to-blue-600",
            "display_order": 4,
            "is_active": True,
        },
        {
            "title": "General Outstation",
            "description": "Pre-booked cars for intercity travel and tours",
            "vehicle_type": "car",
            "service_mode": "reserve",
            "vehicle_model": "Swift",
            "icon_name": "MapPin",
            "tag_highlight": "Reliable",
            "color_scheme": "from-indigo-400 to-blue-600",
            "display_order": 5,
            "is_active": True,
        },
        {
            "title": "Wedding & Events",
            "description": "Luxury car decoration for Dulha/Dulhan & Guests",
            "vehicle_type": "car",
            "service_mode": "reserve",
            "vehicle_model": "Wedding Special",
            "icon_name": "PartyPopper",
            "tag_highlight": "Premium",
            "color_scheme": "from-rose-500 to-pink-600",
            "display_order": 6,
            "is_active": True,
        },
        {
            "title": "Logistics & Farming",
            "description": "Heavy duty vehicles for bulk shifting and farming tools",
            "vehicle_type": "bolero",
            "service_mode": "reserve",
            "vehicle_model": "Logistics",
            "icon_name": "Truck",
            "tag_highlight": "Heavy Duty",
            "color_scheme": "from-slate-700 to-slate-900",
            "display_order": 7,
            "is_active": True,
        },
    ]


def _ensure_public_services(db: Session) -> list[ServiceMetadata]:
    rows = (
        db.query(ServiceMetadata)
        .filter(ServiceMetadata.is_active.is_(True))
        .order_by(ServiceMetadata.display_order.asc())
        .all()
    )
    if rows:
        return rows

    seeded_rows = [ServiceMetadata(**payload) for payload in _default_services()]
    db.add_all(seeded_rows)
    db.commit()
    return (
        db.query(ServiceMetadata)
        .filter(ServiceMetadata.is_active.is_(True))
        .order_by(ServiceMetadata.display_order.asc())
        .all()
    )

@router.get("/", response_model=list[ServiceMetadataRead])
def list_services(db: Session = Depends(get_db)):
    return _ensure_public_services(db)

@router.get("/all", response_model=list[ServiceMetadataRead])
def list_all_services(_: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    return db.query(ServiceMetadata).order_by(ServiceMetadata.display_order.asc()).all()

@router.post("/", response_model=ServiceMetadataRead)
def create_service(payload: ServiceMetadataCreate, _: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    service = ServiceMetadata(**payload.model_dump())
    db.add(service)
    db.commit()
    db.refresh(service)
    return service

@router.patch("/{service_id}", response_model=ServiceMetadataRead)
def update_service(service_id: str, payload: ServiceMetadataUpdate, _: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    service = db.get(ServiceMetadata, service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(service, key, value)
    
    db.commit()
    db.refresh(service)
    return service

@router.delete("/{service_id}")
def delete_service(service_id: str, _: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    service = db.get(ServiceMetadata, service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    db.delete(service)
    db.commit()
    return {"message": "Service deleted successfully"}
