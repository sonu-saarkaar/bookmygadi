from pathlib import Path

from fastapi import APIRouter
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db import engine
from app.models import Ride, User
from app.schemas import HealthResponse


router = APIRouter(tags=["system"])


@router.get("/")
def root():
    return {"message": "Welcome to BookMyGadi API", "docs": "/docs"}


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    database_path: str | None = None
    database_exists: bool | None = None
    users_count: int | None = None
    rides_count: int | None = None
    status = "ok"
    message = "BookMyGadi FastAPI backend is running"

    if settings.database_url.startswith("sqlite:///"):
        database_path = settings.database_url.removeprefix("sqlite:///")
        database_exists = Path(database_path).exists()
        if not database_exists:
            status = "degraded"
            message = "Configured SQLite file is missing"

    try:
        with Session(engine) as db:
            users_count = db.query(User).count()
            rides_count = db.query(Ride).count()
    except Exception as exc:
        status = "degraded"
        message = f"Database check failed: {exc.__class__.__name__}"

    return HealthResponse(
        status=status,
        message=message,
        database_path=database_path,
        database_exists=database_exists,
        users_count=users_count,
        rides_count=rides_count,
    )


@router.get("/mapbox-token")
def mapbox_token() -> dict:
    return {"token": settings.mapbox_token}
