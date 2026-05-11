from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from .database import get_admin_db
from .schemas import BulkImportResponse, ImportJobStatus, AdminDriverResponse
from .services import AdminService
from .models import ImportExportLog, AdminDriver
from .repository import DriverRepository

router = APIRouter(prefix="/admin-system", tags=["Parallel Production Admin"])
driver_repo = DriverRepository(AdminDriver)

@router.post("/drivers/import", response_model=BulkImportResponse)
async def import_drivers(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_admin_db)
):
    if not file.filename.endswith(('.xlsx', '.csv')):
        raise HTTPException(status_code=400, detail="Only .xlsx or .csv files are supported")
    
    # Read file directly into memory
    contents = await file.read()
    
    # Assuming standard admin id
    admin_id = "admin-123" 
    
    job_id = await AdminService.schedule_driver_import(contents, admin_id, background_tasks, db)
    return {"job_id": job_id, "message": "Import job queued successfully", "status": "processing"}

@router.get("/jobs/{job_id}", response_model=ImportJobStatus)
async def get_job_status(job_id: str, db: AsyncSession = Depends(get_admin_db)):
    log = await db.get(ImportExportLog, job_id)
    if not log:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {
        "job_id": log.id,
        "status": log.status,
        "total_records": log.total_records,
        "successful_records": log.successful_records,
        "failed_records": log.failed_records
    }

@router.get("/drivers", response_model=list[AdminDriverResponse])
async def list_drivers(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_admin_db)):
    drivers = await driver_repo.get_all(db, skip=skip, limit=limit)
    return drivers
