from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_admin_user, get_current_user
from app.db import get_db
from app.models import RiderVehicleRegistration, User, VehicleInventory
from app.schemas import (
    RiderVehicleApprovalAction,
    RiderVehicleRegistrationCreate,
    RiderVehicleRegistrationRead,
    RiderVehicleRegistrationUpdate,
    VehicleCreate,
    VehicleRead,
    VehicleUpdate,
)


router = APIRouter(prefix="/vehicles", tags=["vehicles"])


@router.get("", response_model=list[VehicleRead])
def list_vehicles(
    area: str | None = Query(default=None),
    include_inactive: bool = Query(default=False),
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[VehicleRead]:
    query = db.query(VehicleInventory)
    if area:
        query = query.filter(VehicleInventory.area.ilike(f"%{area}%"))
    if not include_inactive:
        query = query.filter(VehicleInventory.is_active.is_(True))
    return query.order_by(VehicleInventory.created_at.desc()).all()


@router.post("", response_model=VehicleRead, status_code=status.HTTP_201_CREATED)
def create_vehicle(
    payload: VehicleCreate,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> VehicleRead:
    vehicle = VehicleInventory(
        model_name=payload.model_name,
        vehicle_type=payload.vehicle_type,
        color=payload.color,
        vehicle_condition=payload.vehicle_condition,
        has_ac=payload.has_ac,
        seater_count=payload.seater_count,
        area=payload.area,
        live_location=payload.live_location,
        is_active=payload.is_active,
        created_by=admin.id,
    )
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.patch("/{vehicle_id}", response_model=VehicleRead)
def update_vehicle(
    vehicle_id: str,
    payload: VehicleUpdate,
    _admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> VehicleRead:
    vehicle = db.get(VehicleInventory, vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    updates = payload.model_dump(exclude_none=True)
    for key, value in updates.items():
        setattr(vehicle, key, value)

    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vehicle(
    vehicle_id: str,
    _admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    vehicle = db.get(VehicleInventory, vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    db.delete(vehicle)
    db.commit()


import uuid
import random

@router.post("/rider-registrations", response_model=RiderVehicleRegistrationRead, status_code=status.HTTP_201_CREATED)
def create_rider_vehicle_registration(
    payload: RiderVehicleRegistrationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RiderVehicleRegistrationRead:
    if current_user.role not in {"driver", "admin"}:
        raise HTTPException(status_code=403, detail="Driver access required")

    bmg_id = f"BMG{random.randint(100000, 999999)}"
    # ensure uniqueness simple loop (if needed), very low collision chance for now
    
    row = RiderVehicleRegistration(
        driver_id=current_user.id,
        vehicle_type=payload.vehicle_type,
        brand_model=payload.brand_model,
        registration_number=payload.registration_number.upper().strip(),
        color=payload.color,
        seater_count=payload.seater_count,
        vehicle_condition=payload.vehicle_condition,
        area=payload.area,
        rc_number=payload.rc_number,
        insurance_number=payload.insurance_number,
        notes=payload.notes,
        status="pending",
        vehicle_category=payload.vehicle_category,
        service_type=payload.service_type,
        model_year=payload.model_year,
        has_ac=payload.has_ac,
        has_music=payload.has_music,
        owner_name=payload.owner_name,
        owner_phone=payload.owner_phone,
        owner_email=payload.owner_email,
        owner_address=payload.owner_address,
        is_owner_driver=payload.is_owner_driver,
        driver_name=payload.driver_name,
        driver_number=payload.driver_number,
        driver_calling_number=payload.driver_calling_number,
        driver_dl_number=payload.driver_dl_number,
        rider_id_format=bmg_id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/rider-registrations/me", response_model=list[RiderVehicleRegistrationRead])
def list_my_rider_vehicle_registrations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[RiderVehicleRegistrationRead]:
    if current_user.role not in {"driver", "admin"}:
        raise HTTPException(status_code=403, detail="Driver access required")
    return (
        db.query(RiderVehicleRegistration)
        .filter(RiderVehicleRegistration.driver_id == current_user.id)
        .order_by(RiderVehicleRegistration.created_at.desc())
        .all()
    )


@router.patch("/rider-registrations/{registration_id}", response_model=RiderVehicleRegistrationRead)
def update_my_rider_vehicle_registration(
    registration_id: str,
    payload: RiderVehicleRegistrationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RiderVehicleRegistrationRead:
    if current_user.role not in {"driver", "admin"}:
        raise HTTPException(status_code=403, detail="Driver access required")

    row = db.get(RiderVehicleRegistration, registration_id)
    if not row:
        raise HTTPException(status_code=404, detail="Registration not found")
    if row.driver_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not allowed")
    if row.status != "pending" and current_user.role != "admin":
        raise HTTPException(status_code=409, detail="Only pending registration can be updated")

    updates = payload.model_dump(exclude_none=True)
    if "registration_number" in updates:
        updates["registration_number"] = updates["registration_number"].upper().strip()
    for key, value in updates.items():
        setattr(row, key, value)
    if current_user.role != "admin":
        row.admin_note = None
        row.approved_by = None
        row.status = "pending"
    db.commit()
    db.refresh(row)
    return row


@router.get("/rider-registrations", response_model=list[RiderVehicleRegistrationRead])
def list_rider_vehicle_registrations(
    status_filter: str | None = Query(default=None, alias="status"),
    _admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> list[RiderVehicleRegistrationRead]:
    query = db.query(RiderVehicleRegistration)
    if status_filter:
        query = query.filter(RiderVehicleRegistration.status == status_filter)
    return query.order_by(RiderVehicleRegistration.created_at.desc()).all()


@router.post("/rider-registrations/{registration_id}/approve", response_model=RiderVehicleRegistrationRead)
def approve_rider_vehicle_registration(
    registration_id: str,
    payload: RiderVehicleApprovalAction,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> RiderVehicleRegistrationRead:
    row = db.get(RiderVehicleRegistration, registration_id)
    if not row:
        raise HTTPException(status_code=404, detail="Registration not found")

    row.status = "approved"
    row.admin_note = payload.admin_note
    row.approved_by = admin.id
    db.commit()
    db.refresh(row)
    return row


@router.post("/rider-registrations/{registration_id}/reject", response_model=RiderVehicleRegistrationRead)
def reject_rider_vehicle_registration(
    registration_id: str,
    payload: RiderVehicleApprovalAction,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> RiderVehicleRegistrationRead:
    row = db.get(RiderVehicleRegistration, registration_id)
    if not row:
        raise HTTPException(status_code=404, detail="Registration not found")

    row.status = "rejected"
    row.admin_note = payload.admin_note
    row.approved_by = admin.id
    db.commit()
    db.refresh(row)
    return row


@router.post("/rider-registrations/{registration_id}/request-changes", response_model=RiderVehicleRegistrationRead)
def request_changes_rider_vehicle_registration(
    registration_id: str,
    payload: RiderVehicleApprovalAction,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> RiderVehicleRegistrationRead:
    row = db.get(RiderVehicleRegistration, registration_id)
    if not row:
        raise HTTPException(status_code=404, detail="Registration not found")

    row.status = "changes_requested"
    row.admin_note = payload.admin_note or "Please refile with requested changes"
    row.approved_by = admin.id
    db.commit()
    db.refresh(row)
    return row
