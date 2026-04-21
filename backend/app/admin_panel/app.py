from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from pymongo.database import Database

from app.admin_panel.db.mongo import get_mongo_db
from app.admin_panel.routes import (
    approvals_router,
    auth_router,
    dashboard_router,
    drivers_router,
    finance_router,
    live_router,
    logs_router,
    riders_router,
    rides_router,
    support_router,
    tasks_router,
    vehicles_router,
)
from app.admin_panel.services.common import init_doc
from app.api.services import router as services_api_router

admin_app_router = APIRouter(prefix="/api/v2")

for r in [
    auth_router,
    dashboard_router,
    riders_router,
    drivers_router,
    vehicles_router,
    rides_router,
    approvals_router,
    support_router,
    finance_router,
    tasks_router,
    live_router,
    logs_router,
    services_api_router,
]:
    admin_app_router.include_router(r)


@admin_app_router.post("/admin/seed-data")
def seed_data(db: Database = Depends(get_mongo_db)) -> dict:
    now = datetime.now(timezone.utc)
    if db["users"].count_documents({}) == 0:
        db["users"].insert_many(
            [
                init_doc({"name": "Aman Singh", "email": "aman@example.com", "phone": "9870011223", "city": "Varanasi"}),
                init_doc({"name": "Priya Verma", "email": "priya@example.com", "phone": "9870011224", "city": "Lucknow"}),
            ]
        )
    if db["drivers"].count_documents({}) == 0:
        db["drivers"].insert_many(
            [
                init_doc({"name": "Rider One", "phone": "9123456789", "city": "Varanasi", "rating": 4.7, "status": "online"}),
                init_doc({"name": "Rider Two", "phone": "9234567890", "city": "Lucknow", "rating": 4.4, "status": "approved"}),
            ]
        )
    if db["vehicles"].count_documents({}) == 0:
        db["vehicles"].insert_many(
            [
                init_doc({"number_plate": "UP65AB1001", "model": "Dzire", "category": "sedan", "seats": 4, "ac": True, "city": "Varanasi"}, "approved"),
                init_doc({"number_plate": "UP32CD2202", "model": "Ertiga", "category": "muv", "seats": 6, "ac": True, "city": "Lucknow"}, "pending"),
            ]
        )
    if db["rides"].count_documents({}) == 0:
        db["rides"].insert_many(
            [
                init_doc({"rider_name": "Aman Singh", "pickup": "Lanka", "drop": "Cantt", "fare": 250, "city": "Varanasi", "payment_status": "unpaid"}, "pending"),
                init_doc({"rider_name": "Priya Verma", "pickup": "Hazratganj", "drop": "Airport", "fare": 670, "city": "Lucknow", "payment_status": "paid"}, "completed"),
            ]
        )
    if db["approvals"].count_documents({}) == 0:
        db["approvals"].insert_many(
            [
                init_doc({"applicant_name": "Rider Two", "city": "Lucknow", "risk_score": 38, "doc_score": 82, "reviewer": "ops@bookmygadi.com"}, "pending"),
                init_doc({"applicant_name": "Rider Three", "city": "Varanasi", "risk_score": 61, "doc_score": 58, "reviewer": "ops@bookmygadi.com"}, "pending"),
            ]
        )
    if db["support_tickets"].count_documents({}) == 0:
        db["support_tickets"].insert_many(
            [
                init_doc({"title": "Fare dispute", "category": "dispute", "severity": "high", "linked_ride_id": "", "linked_rider_id": "", "linked_driver_id": "", "assigned_to": None}, "open"),
                init_doc({"title": "Late arrival", "category": "delay", "severity": "medium", "linked_ride_id": "", "linked_rider_id": "", "linked_driver_id": "", "assigned_to": None}, "open"),
            ]
        )
    if db["payments"].count_documents({}) == 0:
        db["payments"].insert_many(
            [
                init_doc({"ride_id": "seed-ride-1", "driver_id": "seed-driver-1", "amount": 250.0, "method": "upi"}, "paid"),
                init_doc({"ride_id": "seed-ride-2", "driver_id": "seed-driver-2", "amount": 670.0, "method": "cash"}, "pending"),
            ]
        )
    if db["tasks"].count_documents({}) == 0:
        db["tasks"].insert_many(
            [
                init_doc({"title": "Verify DL docs", "type": "driver_verification", "linked_entity_type": "approval", "linked_entity_id": "seed-approval-1", "assignee_admin_id": "ops", "priority": "high", "comments": []}, "todo"),
                init_doc({"title": "Resolve fare dispute", "type": "support_issue", "linked_entity_type": "ticket", "linked_entity_id": "seed-ticket-1", "assignee_admin_id": "support", "priority": "medium", "comments": []}, "in_progress"),
            ]
        )
    if db["logs"].count_documents({}) == 0:
        db["logs"].insert_many(
            [
                init_doc({"admin_id": "system", "admin_name": "System", "admin_role": "super_admin", "module": "dispatch", "action": "driver_shortage", "meta": {"zone": "Lanka", "pending": 8}}),
                init_doc({"admin_id": "system", "admin_name": "System", "admin_role": "super_admin", "module": "health", "action": "poll", "meta": {"uptime_hours": 12}}),
            ]
        )

    db["logs"].insert_one(
        init_doc({"admin_id": "system", "admin_name": "System", "admin_role": "super_admin", "module": "seed", "action": "seed_data", "meta": {"at": now.isoformat()}})
    )
    return {"ok": True, "message": "Seed data ensured"}
