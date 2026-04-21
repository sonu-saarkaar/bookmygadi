from fastapi import APIRouter

from app.core.config import settings
from app.schemas import HealthResponse


router = APIRouter(tags=["system"])


@router.get("/")
def root():
    return {"message": "Welcome to BookMyGadi API", "docs": "/docs"}


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", message="BookMyGadi FastAPI backend is running")


@router.get("/mapbox-token")
def mapbox_token() -> dict:
    return {"token": settings.mapbox_token}
