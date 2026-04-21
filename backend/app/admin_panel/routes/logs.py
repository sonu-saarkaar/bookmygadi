from fastapi import APIRouter, Depends
from pymongo.database import Database

from app.admin_panel.db.mongo import get_mongo_db
from app.admin_panel.services.common import list_docs
from app.admin_panel.utils.security import get_current_admin

router = APIRouter(prefix="/admin/logs", tags=["admin-logs"])


@router.get("")
def list_logs(_: dict = Depends(get_current_admin), db: Database = Depends(get_mongo_db)) -> list[dict]:
    return list_docs(db, "logs", {}, limit=300)
