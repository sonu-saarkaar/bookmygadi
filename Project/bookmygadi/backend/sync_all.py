import sys
from sqlalchemy.orm import Session
from app.db import SessionLocal
from app.models import User, CRMDriver, RiderVehicleRegistration, VehicleInventory

def sync_all_data():
    db: Session = SessionLocal()
    
    # 1. Sync from RiderVehicleRegistration
    regs = db.query(RiderVehicleRegistration).all()
    print(f"Found {len(regs)} Rider Registrations.")
    for reg in regs:
        phone = reg.driver_number or reg.owner_phone or "Unknown"
        exists = db.query(CRMDriver).filter(CRMDriver.phone == phone).first()
        if exists:
            continue
            
        status = "NEW"
        if reg.status == "approved":
            status = "APPROVED"
        elif reg.status == "pending":
            status = "REVIEW"
        elif reg.status == "rejected":
            status = "REJECTED"
            
        crm = CRMDriver(
            name=reg.driver_name or reg.owner_name or "Unknown",
            phone=phone,
            address=reg.owner_address or reg.area or "Unknown",
            vehicle_type=reg.vehicle_type or reg.vehicle_category or "car",
            brand_model=reg.brand_model or "Unknown",
            registration_number=reg.registration_number or "UNKNOWN",
            license_number=reg.driver_dl_number,
            status=status
        )
        db.add(crm)
        
    # 2. Sync from VehicleInventory
    vehicles = db.query(VehicleInventory).all()
    print(f"Found {len(vehicles)} Fleet Vehicles.")
    for v in vehicles:
        name = f"Fleet {v.model_name}"
        phone = "Fleet" # identifier
        exists = db.query(CRMDriver).filter(CRMDriver.brand_model == v.model_name).first()
        if exists:
            continue
            
        crm = CRMDriver(
            name="Fleet Internal",
            phone=f"FLEET-{v.id[-6:]}",
            address=v.area or "Internal",
            vehicle_type=v.vehicle_type or "car",
            brand_model=v.model_name,
            registration_number=f"FLEET-{v.id[-4:]}",
            status="APPROVED" if v.is_active else "BLOCKED"
        )
        db.add(crm)
        
    db.commit()
    print("Sync completed.")
    
if __name__ == "__main__":
    sync_all_data()
