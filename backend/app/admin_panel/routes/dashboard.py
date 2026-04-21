from fastapi import APIRouter, Depends
from pymongo.database import Database

from app.admin_panel.db.mongo import get_mongo_db
from app.admin_panel.utils.security import get_current_admin

router = APIRouter(prefix="/admin/dashboard", tags=["admin-dashboard"])


@router.get("/kpis")
def get_kpis(_: dict = Depends(get_current_admin), db: Database = Depends(get_mongo_db)) -> dict:
    total_riders = db["users"].count_documents({})
    total_drivers = db["drivers"].count_documents({})
    total_vehicles = db["vehicles"].count_documents({})
    total_rides = db["rides"].count_documents({})
    active_rides = db["rides"].count_documents({"status": {"$in": ["accepted", "in_progress", "arriving"]}})
    completed_rides = db["rides"].count_documents({"status": "completed"})
    pending_approvals = db["approvals"].count_documents({"status": "pending"})
    open_tickets = db["support_tickets"].count_documents({"status": {"$in": ["open", "assigned", "in_progress"]}})
    paid_revenue = list(db["payments"].aggregate([{"$match": {"status": "paid"}}, {"$group": {"_id": None, "amount": {"$sum": "$amount"}}}]))
    revenue = float(paid_revenue[0]["amount"]) if paid_revenue else 0.0

    return {
        "total_riders": total_riders,
        "total_drivers": total_drivers,
        "total_vehicles": total_vehicles,
        "total_rides": total_rides,
        "active_rides": active_rides,
        "completed_rides": completed_rides,
        "pending_approvals": pending_approvals,
        "open_tickets": open_tickets,
        "revenue": revenue,
    }
