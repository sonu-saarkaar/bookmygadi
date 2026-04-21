from datetime import datetime
from pydantic import BaseModel, Field, EmailStr


class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class AdminAuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    name: str


class StatusUpdateRequest(BaseModel):
    status: str


class TaskCreateRequest(BaseModel):
    title: str
    type: str
    linked_entity_type: str
    linked_entity_id: str
    assignee_admin_id: str
    priority: str = "medium"
    due_date: datetime | None = None


class TaskStatusRequest(BaseModel):
    status: str


class AssignmentRequest(BaseModel):
    assignee_admin_id: str


class ApprovalActionRequest(BaseModel):
    action: str = Field(pattern="^(approve|reject|request_changes)$")
    note: str | None = None


class DriverAssignRequest(BaseModel):
    driver_id: str


class RiderUpdateRequest(BaseModel):
    name: str | None = None
    phone: str | None = None
    city: str | None = None
    status: str | None = None


class DriverUpdateRequest(BaseModel):
    name: str | None = None
    phone: str | None = None
    city: str | None = None
    status: str | None = None


class VehicleCreateRequest(BaseModel):
    number_plate: str
    model: str
    category: str
    seats: int = Field(ge=1)
    ac: bool = True
    owner_driver_id: str | None = None
    city: str


class VehicleExpiryRequest(BaseModel):
    insurance_expiry: datetime | None = None
    permit_expiry: datetime | None = None
    pollution_expiry: datetime | None = None


class TicketCreateRequest(BaseModel):
    title: str
    category: str
    severity: str = "medium"
    linked_ride_id: str | None = None
    linked_rider_id: str | None = None
    linked_driver_id: str | None = None


class PaymentPayoutRequest(BaseModel):
    payment_id: str


class TicketStatusRequest(BaseModel):
    status: str


class LogCreateRequest(BaseModel):
    action: str
    module: str
    meta: dict | None = None
