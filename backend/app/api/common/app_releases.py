from datetime import datetime
from pathlib import Path
import hashlib
import json
import re
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from pydantic import BaseModel

from app.api.common.deps import get_admin_user
from app.core.config import settings
from app.models import User


router = APIRouter(tags=["app-releases"])

APP_TYPES = {"user", "rider"}
MAX_APK_BYTES = 300 * 1024 * 1024
STORAGE_DIR = Path(settings.app_release_storage_dir).resolve()
MANIFEST_PATH = STORAGE_DIR / "releases.json"


class AppReleaseRead(BaseModel):
    id: str
    app_type: str
    version_name: str
    version_code: str | None = None
    release_notes: str | None = None
    file_name: str
    file_size: int
    sha256: str
    download_path: str
    download_url: str
    uploaded_at: str
    uploaded_by: str | None = None


def _ensure_storage() -> None:
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    for app_type in APP_TYPES:
        (STORAGE_DIR / app_type).mkdir(parents=True, exist_ok=True)
    if not MANIFEST_PATH.exists():
        MANIFEST_PATH.write_text(json.dumps({"releases": []}, indent=2), encoding="utf-8")


def _read_manifest() -> dict:
    _ensure_storage()
    try:
        data = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        if isinstance(data.get("releases"), list):
            return data
    except (OSError, json.JSONDecodeError):
        pass
    return {"releases": []}


def _write_manifest(data: dict) -> None:
    _ensure_storage()
    MANIFEST_PATH.write_text(json.dumps(data, indent=2), encoding="utf-8")


def _safe_filename(value: str) -> str:
    name = Path(value or "bookmygadi.apk").name
    name = re.sub(r"[^A-Za-z0-9._-]+", "-", name).strip(".-")
    return name or "bookmygadi.apk"


def _download_url(request: Request, download_path: str) -> str:
    public_base = settings.app_release_public_base_url.strip().rstrip("/")
    base = public_base or str(request.base_url).rstrip("/")
    return f"{base}{download_path}"


def _public_record(request: Request, row: dict) -> AppReleaseRead:
    return AppReleaseRead(
        **row,
        download_url=_download_url(request, row["download_path"]),
    )


def _sorted_releases(data: dict) -> list[dict]:
    return sorted(data.get("releases", []), key=lambda item: item.get("uploaded_at", ""), reverse=True)


def _latest_by_type(data: dict, app_type: str) -> dict | None:
    for row in _sorted_releases(data):
        if row.get("app_type") == app_type:
            return row
    return None


@router.get("/app-releases/latest")
def latest_app_releases(request: Request):
    data = _read_manifest()
    return {
        app_type: (
            _public_record(request, row).model_dump()
            if (row := _latest_by_type(data, app_type))
            else None
        )
        for app_type in sorted(APP_TYPES)
    }


@router.get("/admin/app-releases", response_model=list[AppReleaseRead])
def list_app_releases(request: Request, current_user: User = Depends(get_admin_user)):
    data = _read_manifest()
    return [_public_record(request, row) for row in _sorted_releases(data)]


@router.post("/admin/app-releases/upload", response_model=AppReleaseRead, status_code=status.HTTP_201_CREATED)
async def upload_app_release(
    request: Request,
    app_type: str = Form(...),
    version_name: str = Form(...),
    version_code: str | None = Form(None),
    release_notes: str | None = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_admin_user),
):
    normalized_type = (app_type or "").strip().lower()
    if normalized_type not in APP_TYPES:
        raise HTTPException(status_code=400, detail="app_type must be 'user' or 'rider'")

    clean_version = (version_name or "").strip()
    if not clean_version:
        raise HTTPException(status_code=400, detail="Version name is required")

    original_name = _safe_filename(file.filename or f"bookmygadi-{normalized_type}.apk")
    if not original_name.lower().endswith(".apk"):
        raise HTTPException(status_code=400, detail="Only .apk files are allowed")

    _ensure_storage()
    release_id = str(uuid.uuid4())
    stamped_name = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{release_id[:8]}-{original_name}"
    target_dir = (STORAGE_DIR / normalized_type).resolve()
    target_path = (target_dir / stamped_name).resolve()
    if target_dir not in target_path.parents:
        raise HTTPException(status_code=400, detail="Invalid upload filename")

    digest = hashlib.sha256()
    total = 0
    try:
        with target_path.open("wb") as out:
            while chunk := await file.read(1024 * 1024):
                total += len(chunk)
                if total > MAX_APK_BYTES:
                    out.close()
                    target_path.unlink(missing_ok=True)
                    raise HTTPException(status_code=413, detail="APK size must be under 300 MB")
                digest.update(chunk)
                out.write(chunk)
    finally:
        await file.close()

    if total == 0:
        target_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="Uploaded APK is empty")

    row = {
        "id": release_id,
        "app_type": normalized_type,
        "version_name": clean_version,
        "version_code": (version_code or "").strip() or None,
        "release_notes": (release_notes or "").strip() or None,
        "file_name": original_name,
        "file_size": total,
        "sha256": digest.hexdigest(),
        "download_path": f"/downloads/app-releases/{normalized_type}/{stamped_name}",
        "uploaded_at": datetime.utcnow().isoformat(),
        "uploaded_by": current_user.email,
    }

    data = _read_manifest()
    data.setdefault("releases", []).append(row)
    _write_manifest(data)

    return _public_record(request, row)
