from fastapi import APIRouter, Depends, HTTPException
from pymongo.database import Database

from app.admin_panel.db.mongo import get_mongo_db
from app.admin_panel.schemas.contracts import VehicleCreateRequest, VehicleExpiryRequest
from app.admin_panel.services.common import init_doc, list_docs, oid, serialize, touch_update, write_log
from app.admin_panel.utils.security import get_current_admin

router = APIRouter(prefix="/admin/vehicles", tags=["admin-vehicles"])


@router.get("")
def list_vehicles(_: dict = Depends(get_current_admin), db: Database = Depends(get_mongo_db)) -> list[dict]:
    return list_docs(db, "vehicles", {})


@router.post("")
def add_vehicle(payload: VehicleCreateRequest, admin: dict = Depends(get_current_admin), db: Database = Depends(get_mongo_db)) -> dict:
    row = init_doc(payload.model_dump(), status="pending")
    result = db["vehicles"].insert_one(row)
    created = db["vehicles"].find_one({"_id": result.inserted_id})
    write_log(db, admin, "add_vehicle", "vehicles", {"vehicle_id": str(result.inserted_id)})
    return serialize(created)


@router.post("/{vehicle_id}/approve")
def approve_vehicle(vehicle_id: str, admin: dict = Depends(get_current_admin), db: Database = Depends(get_mongo_db)) -> dict:
    db["vehicles"].update_one({"_id": oid(vehicle_id)}, {"$set": touch_update({"status": "approved"})})
    row = db["vehicles"].find_one({"_id": oid(vehicle_id)})
    if not row:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    write_log(db, admin, "approve_vehicle", "vehicles", {"vehicle_id": vehicle_id})
    return serialize(row)


@router.patch("/{vehicle_id}/expiry")
def update_vehicle_expiry(vehicle_id: str, payload: VehicleExpiryRequest, admin: dict = Depends(get_current_admin), db: Database = Depends(get_mongo_db)) -> dict:
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No expiry fields provided")
    db["vehicles"].update_one({"_id": oid(vehicle_id)}, {"$set": touch_update(updates)})
    row = db["vehicles"].find_one({"_id": oid(vehicle_id)})
    if not row:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    write_log(db, admin, "update_vehicle_expiry", "vehicles", {"vehicle_id": vehicle_id, "updates": updates})
    return serialize(row)
