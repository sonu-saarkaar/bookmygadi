from fastapi import APIRouter, Depends, HTTPException
from pymongo.database import Database

from app.admin_panel.db.mongo import get_mongo_db
from app.admin_panel.schemas.contracts import AssignmentRequest, TaskCreateRequest, TaskStatusRequest
from app.admin_panel.services.common import init_doc, list_docs, oid, serialize, touch_update, write_log
from app.admin_panel.utils.security import get_current_admin

router = APIRouter(prefix="/admin/tasks", tags=["admin-tasks"])


@router.get("")
def list_tasks(_: dict = Depends(get_current_admin), db: Database = Depends(get_mongo_db)) -> list[dict]:
    return list_docs(db, "tasks", {}, limit=500)


@router.post("")
def create_task(payload: TaskCreateRequest, admin: dict = Depends(get_current_admin), db: Database = Depends(get_mongo_db)) -> dict:
    row = init_doc(payload.model_dump(), status="todo")
    row["comments"] = []
    result = db["tasks"].insert_one(row)
    created = db["tasks"].find_one({"_id": result.inserted_id})
    write_log(db, admin, "create_task", "tasks", {"task_id": str(result.inserted_id)})
    return serialize(created)


@router.patch("/{task_id}/assign")
def assign_task(task_id: str, payload: AssignmentRequest, admin: dict = Depends(get_current_admin), db: Database = Depends(get_mongo_db)) -> dict:
    db["tasks"].update_one({"_id": oid(task_id)}, {"$set": touch_update({"assignee_admin_id": payload.assignee_admin_id})})
    row = db["tasks"].find_one({"_id": oid(task_id)})
    if not row:
        raise HTTPException(status_code=404, detail="Task not found")
    write_log(db, admin, "assign_task", "tasks", {"task_id": task_id, "assignee": payload.assignee_admin_id})
    return serialize(row)


@router.patch("/{task_id}/status")
def update_task_status(task_id: str, payload: TaskStatusRequest, admin: dict = Depends(get_current_admin), db: Database = Depends(get_mongo_db)) -> dict:
    db["tasks"].update_one({"_id": oid(task_id)}, {"$set": touch_update({"status": payload.status})})
    row = db["tasks"].find_one({"_id": oid(task_id)})
    if not row:
        raise HTTPException(status_code=404, detail="Task not found")
    write_log(db, admin, "update_task_status", "tasks", {"task_id": task_id, "status": payload.status})
    return serialize(row)
