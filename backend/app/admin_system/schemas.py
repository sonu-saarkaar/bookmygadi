from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime, date

class AdminDriverBase(BaseModel):
    aadhaar_number: str
    driving_license_number: str
    dl_expiry_date: Optional[date] = None
    city: str
    state: str
    pincode: str
    emergency_contact: str

class AdminDriverCreate(AdminDriverBase):
    pass

class AdminDriverResponse(AdminDriverBase):
    id: str
    verification_status: str
    created_at: datetime
    is_deleted: bool
    model_config = ConfigDict(from_attributes=True)

class BulkImportResponse(BaseModel):
    job_id: str
    message: str
    status: str

class ImportJobStatus(BaseModel):
    job_id: str
    status: str
    total_records: int
    successful_records: int
    failed_records: int
