from fastapi import APIRouter, Depends, HTTPException, Query
from pymongo.database import Database

from app.admin_panel.db.mongo import get_mongo_db
from app.admin_panel.schemas.contracts import DriverUpdateRequest
from app.admin_panel.services.common import list_docs, oid, serialize, touch_update, write_log
from app.admin_panel.utils.security import get_current_admin

router = APIRouter(prefix="/admin/drivers", tags=["admin-drivers"])


@router.get("")
def list_drivers(status: str | None = Query(default=None), _: dict = Depends(get_current_admin), db: Database = Depends(get_mongo_db)) -> list[dict]:
    q = {"status": status} if status else {}
    return list_docs(db, "drivers", q)


@router.get("/{driver_id}")
def get_driver(driver_id: str, _: dict = Depends(get_current_admin), db: Database = Depends(get_mongo_db)) -> dict:
    row = db["drivers"].find_one({"_id": oid(driver_id)})
    if not row:
        raise HTTPException(status_code=404, detail="Driver not found")
    return serialize(row)


@router.patch("/{driver_id}")
def update_driver(driver_id: str, payload: DriverUpdateRequest, admin: dict = Depends(get_current_admin), db: Database = Depends(get_mongo_db)) -> dict:
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No changes provided")
    db["drivers"].update_one({"_id": oid(driver_id)}, {"$set": touch_update(updates)})
    row = db["drivers"].find_one({"_id": oid(driver_id)})
    if not row:
        raise HTTPException(status_code=404, detail="Driver not found")
    write_log(db, admin, "update_driver", "drivers", {"driver_id": driver_id, "updates": updates})
    return serialize(row)


@router.post("/{driver_id}/approve")
def approve_driver(driver_id: str, admin: dict = Depends(get_current_admin), db: Database = Depends(get_mongo_db)) -> dict:
    db["drivers"].update_one({"_id": oid(driver_id)}, {"$set": touch_update({"status": "approved"})})
    row = db["drivers"].find_one({"_id": oid(driver_id)})
    if not row:
        raise HTTPException(status_code=404, detail="Driver not found")
    write_log(db, admin, "approve_driver", "drivers", {"driver_id": driver_id})
    return serialize(row)


@router.post("/{driver_id}/reject")
def reject_driver(driver_id: str, admin: dict = Depends(get_current_admin), db: Database = Depends(get_mongo_db)) -> dict:
    db["drivers"].update_one({"_id": oid(driver_id)}, {"$set": touch_update({"status": "rejected"})})
    row = db["drivers"].find_one({"_id": oid(driver_id)})
    if not row:
        raise HTTPException(status_code=404, detail="Driver not found")
    write_log(db, admin, "reject_driver", "drivers", {"driver_id": driver_id})
    return serialize(row)
