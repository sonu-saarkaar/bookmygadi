import pandas as pd
from io import BytesIO
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import BackgroundTasks
from .models import AdminDriver, ImportExportLog
from .repository import DriverRepository
from .logger import admin_logger
import asyncio

driver_repo = DriverRepository(AdminDriver)

class AdminService:
    @staticmethod
    async def process_excel_import(file_bytes: bytes, admin_id: str, job_id: str, db: AsyncSession):
        """Background task for processing excel imports to avoid blocking."""
        try:
            df = pd.read_excel(BytesIO(file_bytes))
            
            # Fetch log to update status
            log = await db.get(ImportExportLog, job_id)
            if not log:
                return

            log.total_records = len(df)
            success = 0
            failed = 0
            
            for index, row in df.iterrows():
                try:
                    dl = str(row.get('driving_license_number', '')).strip()
                    aadhaar = str(row.get('aadhaar_number', '')).strip()
                    
                    # Duplicate conflict resolution system
                    existing_dl = await driver_repo.get_by_dl(db, dl)
                    existing_aadhaar = await driver_repo.get_by_aadhaar(db, aadhaar)
                    
                    if existing_dl or existing_aadhaar:
                        admin_logger.warning(f"Conflict: Driver with DL {dl} or Aadhaar {aadhaar} exists. Skipping row {index}.")
                        failed += 1
                        continue

                    obj_in = {
                        "aadhaar_number": aadhaar,
                        "driving_license_number": dl,
                        "city": str(row.get('city', '')),
                        "state": str(row.get('state', '')),
                        "pincode": str(row.get('pincode', '')),
                        "emergency_contact": str(row.get('emergency_contact', '')),
                        "verification_status": "pending"
                    }
                    await driver_repo.create(db, obj_in)
                    success += 1
                except Exception as e:
                    admin_logger.error(f"Failed to import row {index}: {e}")
                    failed += 1

            log.successful_records = success
            log.failed_records = failed
            log.status = "completed"
            await db.commit()
            
        except Exception as e:
            admin_logger.error(f"Job {job_id} failed completely: {e}")
            log = await db.get(ImportExportLog, job_id)
            if log:
                log.status = "failed"
                await db.commit()

    @staticmethod
    async def schedule_driver_import(file_bytes: bytes, admin_id: str, background_tasks: BackgroundTasks, db: AsyncSession):
        """Creates the job tracking record and schedules the background task."""
        log = ImportExportLog(
            file_name="driver_import.xlsx",
            operation_type="import",
            uploaded_by=admin_id,
            status="processing"
        )
        db.add(log)
        await db.commit()
        await db.refresh(log)
        
        # Async task offloading (readiness for Celery/Redis if needed later)
        background_tasks.add_task(AdminService.process_excel_import, file_bytes, admin_id, log.id, db)
        return log.id
