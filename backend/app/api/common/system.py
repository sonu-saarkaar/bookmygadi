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


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}


@router.get("/mapbox-token")
def mapbox_token() -> dict:
    return {"token": settings.mapbox_token}
