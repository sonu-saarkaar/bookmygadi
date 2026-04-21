from fastapi import APIRouter, Depends, HTTPException
from pymongo.database import Database

from app.admin_panel.db.mongo import get_mongo_db
from app.admin_panel.schemas.contracts import PaymentPayoutRequest
from app.admin_panel.services.common import list_docs, oid, serialize, touch_update, write_log
from app.admin_panel.utils.security import get_current_admin, require_roles

router = APIRouter(prefix="/admin/finance", tags=["admin-finance"])


@router.get("/overview")
def finance_overview(_: dict = Depends(get_current_admin), db: Database = Depends(get_mongo_db)) -> dict:
    paid = list(db["payments"].aggregate([{"$match": {"status": "paid"}}, {"$group": {"_id": None, "sum": {"$sum": "$amount"}}}]))
    payouts = list(db["payments"].aggregate([{"$match": {"status": "payout_done"}}, {"$group": {"_id": None, "sum": {"$sum": "$amount"}}}]))
    pending = db["payments"].count_documents({"status": "pending"})
    failed = db["payments"].count_documents({"status": "failed"})

    return {
        "revenue": float(paid[0]["sum"]) if paid else 0.0,
        "payout_done": float(payouts[0]["sum"]) if payouts else 0.0,
        "pending": pending,
        "failed": failed,
        "rows": list_docs(db, "payments", {}, limit=200),
    }


@router.post("/payout")
def payout_driver(payload: PaymentPayoutRequest, admin: dict = Depends(require_roles("super_admin", "finance_manager")), db: Database = Depends(get_mongo_db)) -> dict:
    db["payments"].update_one({"_id": oid(payload.payment_id)}, {"$set": touch_update({"status": "payout_done"})})
    row = db["payments"].find_one({"_id": oid(payload.payment_id)})
    if not row:
        raise HTTPException(status_code=404, detail="Payment not found")
    write_log(db, admin, "payout_driver", "finance", {"payment_id": payload.payment_id})
    return serialize(row)
