from fastapi import APIRouter, Depends, HTTPException
from pymongo.database import Database

from app.admin_panel.db.mongo import get_mongo_db
from app.admin_panel.schemas.contracts import AssignmentRequest, TicketCreateRequest, TicketStatusRequest
from app.admin_panel.services.common import init_doc, list_docs, oid, serialize, touch_update, write_log
from app.admin_panel.utils.security import get_current_admin

router = APIRouter(prefix="/admin/support", tags=["admin-support"])


@router.get("/tickets")
def list_tickets(_: dict = Depends(get_current_admin), db: Database = Depends(get_mongo_db)) -> list[dict]:
    return list_docs(db, "support_tickets", {}, limit=300)


@router.post("/tickets")
def create_ticket(payload: TicketCreateRequest, admin: dict = Depends(get_current_admin), db: Database = Depends(get_mongo_db)) -> dict:
    row = init_doc({**payload.model_dump(), "assigned_to": None}, status="open")
    result = db["support_tickets"].insert_one(row)
    created = db["support_tickets"].find_one({"_id": result.inserted_id})
    write_log(db, admin, "create_ticket", "support", {"ticket_id": str(result.inserted_id)})
    return serialize(created)


@router.patch("/tickets/{ticket_id}/assign")
def assign_ticket(ticket_id: str, payload: AssignmentRequest, admin: dict = Depends(get_current_admin), db: Database = Depends(get_mongo_db)) -> dict:
    db["support_tickets"].update_one({"_id": oid(ticket_id)}, {"$set": touch_update({"assigned_to": payload.assignee_admin_id, "status": "assigned"})})
    row = db["support_tickets"].find_one({"_id": oid(ticket_id)})
    if not row:
        raise HTTPException(status_code=404, detail="Ticket not found")
    write_log(db, admin, "assign_ticket", "support", {"ticket_id": ticket_id, "assignee": payload.assignee_admin_id})
    return serialize(row)


@router.patch("/tickets/{ticket_id}/status")
def update_ticket_status(ticket_id: str, payload: TicketStatusRequest, admin: dict = Depends(get_current_admin), db: Database = Depends(get_mongo_db)) -> dict:
    db["support_tickets"].update_one({"_id": oid(ticket_id)}, {"$set": touch_update({"status": payload.status})})
    row = db["support_tickets"].find_one({"_id": oid(ticket_id)})
    if not row:
        raise HTTPException(status_code=404, detail="Ticket not found")
    write_log(db, admin, "update_ticket_status", "support", {"ticket_id": ticket_id, "status": payload.status})
    return serialize(row)
