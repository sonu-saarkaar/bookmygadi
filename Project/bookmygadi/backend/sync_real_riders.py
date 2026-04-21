import sys
import os

from sqlalchemy.orm import Session
from app.db import SessionLocal
from app.models import User, CRMDriver, RiderVehicleRegistration

def sync_riders():
    db: Session = SessionLocal()
    
    # Get all users with role driver
    real_drivers = db.query(User).filter(User.role == 'driver').all()
    print(f"Found {len(real_drivers)} real drivers in User table.")
    
    for driver in real_drivers:
        # Check if already in CRMDriver by phone
        if driver.phone:
            exists = db.query(CRMDriver).filter(CRMDriver.phone == driver.phone).first()
            if exists:
                continue
                
        # Get vehicle registration
        reg = db.query(RiderVehicleRegistration).filter(RiderVehicleRegistration.driver_id == driver.id).first()
        
        # Determine CRM status
        status = "NEW"
        if reg:
            if reg.status == "approved":
                status = "APPROVED"
            elif reg.status == "pending":
                status = "REVIEW"
            elif reg.status == "rejected":
                status = "REJECTED"
                
        crm = CRMDriver(
            name=driver.name or "Unknown Driver",
            phone=driver.phone or "Unknown",
            address=driver.city,
            vehicle_type=reg.vehicle_type if reg else "car",
            brand_model=reg.brand_model if reg else "Unknown Model",
            registration_number=reg.registration_number if reg else "UNKNOWN_RC",
            license_number=reg.driver_dl_number if reg else None,
            status=status
        )
        db.add(crm)
        
    db.commit()
    print("Sync completed.")
    
if __name__ == "__main__":
    sync_riders()
