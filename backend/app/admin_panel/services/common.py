from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from pymongo.database import Database


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def oid(value: str) -> ObjectId:
    return ObjectId(value)


def serialize(doc: dict[str, Any] | None) -> dict[str, Any] | None:
    if not doc:
        return None
    out = {**doc, "id": str(doc.get("_id"))}
    out.pop("_id", None)
    return out


def list_docs(db: Database, collection: str, query: dict[str, Any], limit: int = 100) -> list[dict[str, Any]]:
    rows = db[collection].find(query).sort("created_at", -1).limit(limit)
    return [serialize(r) for r in rows]


def write_log(db: Database, admin: dict[str, Any], action: str, module: str, meta: dict[str, Any] | None = None) -> None:
    now = utc_now()
    db["logs"].insert_one(
        {
            "admin_id": str(admin.get("_id")),
            "admin_name": admin.get("name"),
            "admin_role": admin.get("role"),
            "action": action,
            "module": module,
            "meta": meta or {},
            "status": "success",
            "created_at": now,
            "updated_at": now,
        }
    )


def touch_update(values: dict[str, Any]) -> dict[str, Any]:
    return {**values, "updated_at": utc_now()}


def init_doc(values: dict[str, Any], status: str = "active") -> dict[str, Any]:
    now = utc_now()
    return {**values, "status": status, "created_at": now, "updated_at": now}
