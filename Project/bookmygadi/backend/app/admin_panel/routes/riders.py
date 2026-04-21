from fastapi import APIRouter, Depends, HTTPException, Query
from pymongo.database import Database

from app.admin_panel.db.mongo import get_mongo_db
from app.admin_panel.schemas.contracts import RiderUpdateRequest, StatusUpdateRequest
from app.admin_panel.services.common import list_docs, oid, serialize, touch_update, write_log
from app.admin_panel.utils.security import get_current_admin

router = APIRouter(prefix="/admin/riders", tags=["admin-riders"])


@router.get("")
def list_riders(
    q: str | None = Query(default=None),
    status: str | None = Query(default=None),
    _: dict = Depends(get_current_admin),
    db: Database = Depends(get_mongo_db),
) -> list[dict]:
    query: dict = {}
    if status:
        query["status"] = status
    if q:
        query["$or"] = [{"name": {"$regex": q, "$options": "i"}}, {"phone": {"$regex": q, "$options": "i"}}, {"email": {"$regex": q, "$options": "i"}}]
    return list_docs(db, "users", query)


@router.get("/{rider_id}")
def get_rider(rider_id: str, _: dict = Depends(get_current_admin), db: Database = Depends(get_mongo_db)) -> dict:
    row = db["users"].find_one({"_id": oid(rider_id)})
    if not row:
        raise HTTPException(status_code=404, detail="Rider not found")
    return serialize(row)


@router.patch("/{rider_id}")
def update_rider(rider_id: str, payload: RiderUpdateRequest, admin: dict = Depends(get_current_admin), db: Database = Depends(get_mongo_db)) -> dict:
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No changes provided")
    db["users"].update_one({"_id": oid(rider_id)}, {"$set": touch_update(updates)})
    row = db["users"].find_one({"_id": oid(rider_id)})
    if not row:
        raise HTTPException(status_code=404, detail="Rider not found")
    write_log(db, admin, "update_rider", "riders", {"rider_id": rider_id, "updates": updates})
    return serialize(row)


@router.patch("/{rider_id}/block")
def block_rider(rider_id: str, _: StatusUpdateRequest, admin: dict = Depends(get_current_admin), db: Database = Depends(get_mongo_db)) -> dict:
    db["users"].update_one({"_id": oid(rider_id)}, {"$set": touch_update({"status": "blocked"})})
    row = db["users"].find_one({"_id": oid(rider_id)})
    if not row:
        raise HTTPException(status_code=404, detail="Rider not found")
    write_log(db, admin, "block_rider", "riders", {"rider_id": rider_id})
    return serialize(row)


@router.patch("/{rider_id}/unblock")
def unblock_rider(rider_id: str, _: StatusUpdateRequest, admin: dict = Depends(get_current_admin), db: Database = Depends(get_mongo_db)) -> dict:
    db["users"].update_one({"_id": oid(rider_id)}, {"$set": touch_update({"status": "active"})})
    row = db["users"].find_one({"_id": oid(rider_id)})
    if not row:
        raise HTTPException(status_code=404, detail="Rider not found")
    write_log(db, admin, "unblock_rider", "riders", {"rider_id": rider_id})
    return serialize(row)
