from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pymongo.database import Database

from app.admin_panel.db.mongo import get_mongo_db
from app.admin_panel.services.common import list_docs
from app.admin_panel.utils.security import get_current_admin

router = APIRouter(prefix="/admin/live", tags=["admin-live"])


@router.get("/ops")
def live_ops(_: dict = Depends(get_current_admin), db: Database = Depends(get_mongo_db)) -> dict:
    pending = list_docs(db, "rides", {"status": "pending"}, limit=25)
    active = list_docs(db, "drivers", {"status": {"$in": ["online", "busy"]}}, limit=50)
    shortages = list_docs(db, "logs", {"module": "dispatch", "action": "driver_shortage"}, limit=10)
    return {
        "server_time": datetime.now(timezone.utc).isoformat(),
        "pending_rides": pending,
        "driver_live": active,
        "alerts": shortages,
    }
