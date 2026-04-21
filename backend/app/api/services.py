import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app.api.deps import get_admin_user
from app.models import User, ServiceMetadata
from app.schemas import ServiceMetadataCreate, ServiceMetadataUpdate, ServiceMetadataRead

router = APIRouter(prefix="/services", tags=["services"])

@router.get("/", response_model=list[ServiceMetadataRead])
def list_services(db: Session = Depends(get_db)):
    return db.query(ServiceMetadata).filter(ServiceMetadata.is_active.is_(True)).order_by(ServiceMetadata.display_order.asc()).all()

@router.get("/all", response_model=list[ServiceMetadataRead])
def list_all_services(_: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    return db.query(ServiceMetadata).order_by(ServiceMetadata.display_order.asc()).all()

@router.post("/", response_model=ServiceMetadataRead)
def create_service(payload: ServiceMetadataCreate, _: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    service = ServiceMetadata(**payload.model_dump())
    db.add(service)
    db.commit()
    db.refresh(service)
    return service

@router.patch("/{service_id}", response_model=ServiceMetadataRead)
def update_service(service_id: str, payload: ServiceMetadataUpdate, _: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    service = db.get(ServiceMetadata, service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(service, key, value)
    
    db.commit()
    db.refresh(service)
    return service

@router.delete("/{service_id}")
def delete_service(service_id: str, _: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    service = db.get(ServiceMetadata, service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    db.delete(service)
    db.commit()
    return {"message": "Service deleted successfully"}
