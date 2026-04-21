from fastapi import APIRouter, Depends, HTTPException, Query
from pymongo.database import Database

from app.admin_panel.db.mongo import get_mongo_db
from app.admin_panel.schemas.contracts import DriverAssignRequest, StatusUpdateRequest
from app.admin_panel.services.common import list_docs, oid, serialize, touch_update, write_log
from app.admin_panel.utils.security import get_current_admin

router = APIRouter(prefix="/admin/rides", tags=["admin-rides"])


@router.get("")
def list_rides(
    status: str | None = Query(default=None),
    city: str | None = Query(default=None),
    _: dict = Depends(get_current_admin),
    db: Database = Depends(get_mongo_db),
) -> list[dict]:
    query: dict = {}
    if status:
        query["status"] = status
    if city:
        query["city"] = city
    return list_docs(db, "rides", query, limit=250)


@router.patch("/{ride_id}/status")
def update_ride_status(ride_id: str, payload: StatusUpdateRequest, admin: dict = Depends(get_current_admin), db: Database = Depends(get_mongo_db)) -> dict:
    db["rides"].update_one({"_id": oid(ride_id)}, {"$set": touch_update({"status": payload.status})})
    row = db["rides"].find_one({"_id": oid(ride_id)})
    if not row:
        raise HTTPException(status_code=404, detail="Ride not found")
    write_log(db, admin, "update_ride_status", "rides", {"ride_id": ride_id, "status": payload.status})
    return serialize(row)


@router.patch("/{ride_id}/assign-driver")
def assign_driver(ride_id: str, payload: DriverAssignRequest, admin: dict = Depends(get_current_admin), db: Database = Depends(get_mongo_db)) -> dict:
    db["rides"].update_one({"_id": oid(ride_id)}, {"$set": touch_update({"driver_id": payload.driver_id, "status": "assigned"})})
    row = db["rides"].find_one({"_id": oid(ride_id)})
    if not row:
        raise HTTPException(status_code=404, detail="Ride not found")
    write_log(db, admin, "assign_driver", "rides", {"ride_id": ride_id, "driver_id": payload.driver_id})
    return serialize(row)
