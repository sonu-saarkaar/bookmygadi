from fastapi import APIRouter, Depends, HTTPException
from pymongo.database import Database

from app.admin_panel.db.mongo import get_mongo_db
from app.admin_panel.schemas.contracts import ApprovalActionRequest
from app.admin_panel.services.common import list_docs, oid, serialize, touch_update, write_log
from app.admin_panel.utils.security import get_current_admin

router = APIRouter(prefix="/admin/approvals", tags=["admin-approvals"])


@router.get("/pending")
def pending_approvals(_: dict = Depends(get_current_admin), db: Database = Depends(get_mongo_db)) -> list[dict]:
    return list_docs(db, "approvals", {"status": "pending"}, limit=200)


@router.patch("/{approval_id}")
def approval_action(approval_id: str, payload: ApprovalActionRequest, admin: dict = Depends(get_current_admin), db: Database = Depends(get_mongo_db)) -> dict:
    status_map = {"approve": "approved", "reject": "rejected", "request_changes": "changes_requested"}
    updates = touch_update({"status": status_map[payload.action], "review_note": payload.note or ""})
    db["approvals"].update_one({"_id": oid(approval_id)}, {"$set": updates})
    row = db["approvals"].find_one({"_id": oid(approval_id)})
    if not row:
        raise HTTPException(status_code=404, detail="Approval not found")
    write_log(db, admin, "approval_action", "approvals", {"approval_id": approval_id, "action": payload.action})
    return serialize(row)
