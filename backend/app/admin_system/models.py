import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Integer, Boolean, Date
from sqlalchemy.orm import relationship
from .database import AdminBase

class AdminDriver(AdminBase):
    __tablename__ = "admin_drivers"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=True)
    aadhaar_number = Column(String(20), unique=True, index=True)
    driving_license_number = Column(String(50), unique=True, index=True)
    dl_expiry_date = Column(Date, nullable=True)
    verification_status = Column(String(20), default="pending")
    address = Column(Text, nullable=True)
    city = Column(String(100), index=True)
    state = Column(String(100), index=True)
    pincode = Column(String(20))
    emergency_contact = Column(String(20))
    profile_photo = Column(Text, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    mappings = relationship("DriverVehicleMapping", back_populates="driver", lazy="selectin")

class AdminVehicle(AdminBase):
    __tablename__ = "admin_vehicles"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_driver_id = Column(String, ForeignKey("admin_drivers.id", ondelete="SET NULL"), nullable=True)
    vehicle_type = Column(String(50), index=True)
    vehicle_brand = Column(String(100))
    vehicle_model = Column(String(100))
    vehicle_number = Column(String(50), unique=True, index=True)
    rc_number = Column(String(50), nullable=True)
    insurance_number = Column(String(50), nullable=True)
    insurance_expiry = Column(Date, nullable=True)
    pollution_expiry = Column(Date, nullable=True)
    permit_status = Column(String(50), nullable=True)
    verification_status = Column(String(20), default="pending")
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    mappings = relationship("DriverVehicleMapping", back_populates="vehicle", lazy="selectin")

class DriverVehicleMapping(AdminBase):
    __tablename__ = "driver_vehicle_mappings"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    driver_id = Column(String, ForeignKey("admin_drivers.id", ondelete="CASCADE"))
    vehicle_id = Column(String, ForeignKey("admin_vehicles.id", ondelete="CASCADE"))
    assigned_by = Column(String, nullable=True)
    assigned_at = Column(DateTime, default=datetime.utcnow)
    mapping_status = Column(String(20), default="active")
    
    driver = relationship("AdminDriver", back_populates="mappings", lazy="selectin")
    vehicle = relationship("AdminVehicle", back_populates="mappings", lazy="selectin")

class ApprovalLog(AdminBase):
    __tablename__ = "approval_logs"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    entity_type = Column(String(50))
    entity_id = Column(String)
    approved_by = Column(String)
    action = Column(String(50))
    timestamp = Column(DateTime, default=datetime.utcnow)
    remarks = Column(Text, nullable=True)

class ImportExportLog(AdminBase):
    __tablename__ = "import_export_logs"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    file_name = Column(String(255))
    operation_type = Column(String(50))
    uploaded_by = Column(String)
    status = Column(String(20), default="processing") # processing, completed, failed
    total_records = Column(Integer, default=0)
    successful_records = Column(Integer, default=0)
    failed_records = Column(Integer, default=0)
    timestamp = Column(DateTime, default=datetime.utcnow)
