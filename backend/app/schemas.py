from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


class HealthResponse(BaseModel):
    status: str
    message: str
    database_path: str | None = None
    database_exists: bool | None = None
    users_count: int | None = None
    rides_count: int | None = None


class Token(BaseModel):
    access_token: str
    refresh_token: str | None = None
    token_type: str = "bearer"
    role: str | None = None

class RefreshRequest(BaseModel):
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


class HealthResponse(BaseModel):
    status: str
    message: str
    database_path: str | None = None
    database_exists: bool | None = None
    users_count: int | None = None
    rides_count: int | None = None


class Token(BaseModel):
    access_token: str
    refresh_token: str | None = None
    token_type: str = "bearer"
    role: str | None = None

class RefreshRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email_or_mobile: str

class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str | None = None
    password: str = Field(min_length=4, max_length=100)
    role: str = "customer"
    invite_code: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr | None = None
    phone: str | None = None
    password: str

    @model_validator(mode='after')
    def check_email_or_phone(self) -> 'UserLogin':
        if not self.email and not self.phone:
            raise ValueError('Either email or phone must be provided')
        return self


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    public_id: str | None = None
    name: str
    email: EmailStr
    phone: str | None = None
    city: str | None = None
    bio: str | None = None
    emergency_number: str | None = None
    avatar_data: str | None = None
    role: str
    created_at: datetime


class UserUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    city: str | None = None
    bio: str | None = None
    emergency_number: str | None = None
    avatar_data: str | None = None


class RidePreferenceCreate(BaseModel):
    trip_type: str = "oneway"
    pickup_datetime: str | None = None
    return_datetime: str | None = None
    preferred_color: str | None = None
    vehicle_condition: str | None = None
    ac_required: bool = True
    seater_required: int | None = None
    vehicle_model: str | None = None
    urgency_type: str = "ride"
    pickup_area: str | None = None
    reserve_duration_hours: int | None = Field(default=None, ge=5, le=72)
    reserve_radius_km: int | None = Field(default=None, ge=1, le=10)
    reserve_quote_low: int | None = Field(default=None, ge=0)
    reserve_quote_high: int | None = Field(default=None, ge=0)
    reserve_price_source: str | None = None
    reserve_distance_km: float | None = None
    vehicle_count: int = 1
    advance_payment_status: str = "pending"
    advance_amount: int = 0
    market_rate: int | None = None
    booking_mode: str = "normal"
    supervisor_name: str | None = None
    supervisor_phone: str | None = None


class RidePreferenceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    trip_type: str
    pickup_datetime: str | None = None
    return_datetime: str | None = None
    preferred_color: str | None = None
    vehicle_condition: str | None = None
    ac_required: bool
    seater_required: int | None = None
    vehicle_model: str | None = None
    urgency_type: str
    pickup_area: str | None = None
    reserve_duration_hours: int | None = None
    reserve_radius_km: int | None = None
    reserve_quote_low: int | None = None
    reserve_quote_high: int | None = None
    reserve_price_source: str | None = None
    reserve_distance_km: float | None = None
    vehicle_count: int
    advance_payment_status: str
    advance_amount: int
    market_rate: int | None = None
    supervisor_name: str | None = None
    supervisor_phone: str | None = None


class RideCreate(BaseModel):
    pickup_location: str
    destination: str
    vehicle_type: str = "car"
    estimated_fare_min: int | None = None
    estimated_fare_max: int | None = None
    pickup_lat: float | None = None
    pickup_lng: float | None = None
    destination_lat: float | None = None
    destination_lng: float | None = None
    requested_fare: int | None = Field(default=None, ge=1)
    preference: RidePreferenceCreate | None = None


class RideStatusUpdate(BaseModel):
    status: str
    driver_id: str | None = None
    agreed_fare: int | None = None


class DriverVehicleDetails(BaseModel):
    model: str
    number: str
    color: str
    condition: str
    seater: int

class RideRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    public_id: str | None = None
    booking_display_id: str | None = None
    payment_public_id: str | None = None
    payment_display_id: str | None = None
    customer_id: str
    driver_id: str | None = None
    driver_name: str | None = None
    driver_phone: str | None = None
    driver_vehicle_details: DriverVehicleDetails | None = None
    pickup_location: str
    destination: str
    vehicle_type: str
    status: str
    estimated_fare_min: int | None = None
    estimated_fare_max: int | None = None
    agreed_fare: int | None = None
    requested_fare: int | None = None
    pickup_lat: float | None = None
    pickup_lng: float | None = None
    destination_lat: float | None = None
    destination_lng: float | None = None
    start_otp: str | None = None
    payment_status: str = "unpaid"
    driver_live_lat: float | None = None
    driver_live_lng: float | None = None
    customer_live_lat: float | None = None
    customer_live_lng: float | None = None
    accepted_at: datetime | None = None
    arrived_at: datetime | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    preference: RidePreferenceRead | None = None
    created_at: datetime
    updated_at: datetime


class VehicleCreate(BaseModel):
    model_name: str
    vehicle_type: str = "car"
    color: str = "White"
    vehicle_condition: str = "good"
    has_ac: bool = True
    seater_count: int = 4
    area: str
    live_location: str = "Unknown"
    is_active: bool = True


class VehicleUpdate(BaseModel):
    model_name: str | None = None
    vehicle_type: str | None = None
    color: str | None = None
    vehicle_condition: str | None = None
    has_ac: bool | None = None
    seater_count: int | None = None
    area: str | None = None
    live_location: str | None = None
    is_active: bool | None = None


class VehicleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    model_name: str
    vehicle_type: str
    color: str
    vehicle_condition: str
    has_ac: bool
    seater_count: int
    area: str
    live_location: str
    is_active: bool
    created_at: datetime


class RideMessageCreate(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    sender_type: str = "customer"


class RideMessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    ride_id: str
    sender_id: str
    sender_type: str
    message: str
    created_at: datetime


class RealtimeEvent(BaseModel):
    event: str
    ride: RideRead | None = None
    message: RideMessageRead | None = None


class RideNegotiationCreate(BaseModel):
    amount: int = Field(ge=1)


class RideNegotiationAction(BaseModel):
    action: str = Field(pattern="^(accept|reject)$")


class RideNegotiationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    ride_id: str
    offered_by: str
    driver_id: str | None = None
    amount: int
    status: str
    created_at: datetime
    updated_at: datetime


class RiderApiKeyCreate(BaseModel):
    label: str | None = None
    driver_id: str | None = None


class RiderApiKeyRead(BaseModel):
    key: str
    key_prefix: str
    label: str | None = None
    driver_id: str | None = None


class RiderRideAction(BaseModel):
    agreed_fare: int | None = None


class RiderActiveStatusUpdate(BaseModel):
    status: str = Field(pattern="^(arriving|in_progress|completed|cancelled)$")
    start_otp: str | None = None


class LocationUpdate(BaseModel):
    lat: float
    lng: float
    accuracy: float | None = Field(default=None, ge=0)
    heading: float | None = None
    ts: datetime | None = None


class RideTrackingRead(BaseModel):
    ride_id: str
    booking_display_id: str | None = None
    status: str
    pickup_location: str
    destination: str
    driver_live_lat: float | None = None
    driver_live_lng: float | None = None
    driver_live_accuracy: float | None = None
    driver_live_heading: float | None = None
    driver_live_updated_at: datetime | None = None
    customer_live_lat: float | None = None
    customer_live_lng: float | None = None
    customer_live_accuracy: float | None = None
    customer_live_heading: float | None = None
    customer_live_updated_at: datetime | None = None
    pickup_lat: float | None = None
    pickup_lng: float | None = None
    destination_lat: float | None = None
    destination_lng: float | None = None


class PaymentReceiveRead(BaseModel):
    ride_id: str
    payment_public_id: str | None = None
    payment_status: str
    status: str


class RidePaymentMarkRequest(BaseModel):
    payment_method: str = "upi"
    transaction_ref: str | None = None


class RideFeedbackCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str | None = None


class RideSupportTicketCreate(BaseModel):
    issue_type: str = Field(pattern="^(complaint|vehicle_issue|police|emergency)$")
    title: str | None = Field(default=None, min_length=3, max_length=160)
    description: str | None = None
    severity: str = "medium"
    source_panel: str = "user"


class RiderRideRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    public_id: str | None = None
    booking_display_id: str | None = None
    payment_public_id: str | None = None
    pickup_location: str
    destination: str
    vehicle_type: str
    status: str
    estimated_fare_min: int | None = None
    estimated_fare_max: int | None = None
    agreed_fare: int | None = None
    requested_fare: int | None = None
    latest_offer_amount: int | None = None
    latest_offer_by: str | None = None
    latest_offer_status: str | None = None
    accepted_at: datetime | None = None
    arrived_at: datetime | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    customer_name: str | None = None
    customer_phone: str | None = None
    pickup_lat: float | None = None
    pickup_lng: float | None = None
    destination_lat: float | None = None
    destination_lng: float | None = None
    start_otp: str | None = None
    preference: RidePreferenceRead | None = None
    created_at: datetime


class RiderActiveRideRead(BaseModel):
    id: str
    public_id: str | None = None
    booking_display_id: str | None = None
    payment_public_id: str | None = None
    notes: str | None = None

    vehicle_category: str | None = None
    service_type: str | None = None
    model_year: str | None = None
    has_ac: bool | None = None
    has_music: bool | None = None
    owner_name: str | None = None
    owner_phone: str | None = None
    owner_email: str | None = None
    owner_address: str | None = None
    is_owner_driver: bool | None = None
    driver_name: str | None = None
    driver_number: str | None = None
    driver_calling_number: str | None = None
    driver_dl_number: str | None = None


class RiderVehicleRegistrationUpdate(BaseModel):
    vehicle_type: str | None = None
    brand_model: str | None = Field(default=None, min_length=2, max_length=120)
    registration_number: str | None = Field(default=None, min_length=4, max_length=40)
    color: str | None = None
    seater_count: int | None = Field(default=None, ge=1, le=14)
    vehicle_condition: str | None = None
    area: str | None = None
    rc_number: str | None = None
    insurance_number: str | None = None
    notes: str | None = None

    vehicle_category: str | None = None
    service_type: str | None = None
    model_year: str | None = None
    has_ac: bool | None = None
    has_music: bool | None = None
    owner_name: str | None = None
    owner_phone: str | None = None
    owner_email: str | None = None
    owner_address: str | None = None
    is_owner_driver: bool | None = None
    driver_name: str | None = None
    driver_number: str | None = None
    driver_calling_number: str | None = None
    driver_dl_number: str | None = None
    rider_id_format: str | None = None


class RiderVehicleApprovalAction(BaseModel):
    admin_note: str | None = None


class RiderVehicleRegistrationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    request_public_id: str | None = None
    driver_id: str
    vehicle_type: str
    brand_model: str
    registration_number: str
    color: str | None = None
    seater_count: int
    vehicle_condition: str | None = None
    area: str | None = None
    rc_number: str | None = None
    insurance_number: str | None = None
    notes: str | None = None
    status: str
    admin_note: str | None = None
    approved_by: str | None = None

    vehicle_category: str | None = None
    service_type: str | None = None
    model_year: str | None = None
    has_ac: bool | None = None
    has_music: bool | None = None
    owner_name: str | None = None
    owner_phone: str | None = None
    owner_email: str | None = None
    owner_address: str | None = None
    is_owner_driver: bool | None = None
    driver_name: str | None = None
    driver_number: str | None = None
    driver_calling_number: str | None = None
    driver_dl_number: str | None = None
    rider_id_format: str | None = None

    created_at: datetime
    updated_at: datetime


class AdminAlertRead(BaseModel):
    severity: str
    title: str
    message: str
    metric_value: float | None = None


class AdminDashboardRead(BaseModel):
    total_users: int
    total_customers: int
    total_riders: int
    total_admins: int
    total_rides: int
    rides_pending: int
    rides_active: int
    rides_completed: int
    rides_cancelled: int
    rides_rejected: int
    total_vehicles: int
    active_vehicles: int
    pending_vehicle_registrations: int
    payments_paid_count: int
    payments_unpaid_count: int
    gmv_paid: int
    gmv_unpaid: int
    completion_rate: float
    cancel_rate: float
    rides_last_24h: int
    alerts: list[AdminAlertRead]


class AdminAreaLoadRead(BaseModel):
    area: str
    total_requests: int
    pending: int
    active: int
    completed: int
    cancelled: int
    rejected: int
    avg_requested_fare: float | None = None
    avg_agreed_fare: float | None = None
    last_request_at: datetime | None = None


class AdminRideOpsRead(BaseModel):
    id: str
    public_id: str | None = None
    booking_display_id: str | None = None
    payment_public_id: str | None = None
    customer_id: str
    customer_public_id: str | None = None
    customer_name: str | None = None
    customer_phone: str | None = None
    customer_email: str | None = None
    driver_id: str | None = None
    driver_public_id: str | None = None
    driver_name: str | None = None
    driver_phone: str | None = None
    pickup_location: str
    destination: str
    pickup_area: str | None = None
    vehicle_type: str
    status: str
    payment_status: str
    requested_fare: int | None = None
    agreed_fare: int | None = None
    estimated_fare_min: int | None = None
    estimated_fare_max: int | None = None
    urgency_type: str | None = None
    created_at: datetime
    updated_at: datetime


class AdminUserOpsRead(BaseModel):
    id: str
    public_id: str | None = None
    name: str
    email: EmailStr
    phone: str | None = None
    role: str
    created_at: datetime
    total_rides: int
    completed_rides: int
    cancelled_rides: int
    last_ride_at: datetime | None = None


class AdminUserRoleUpdate(BaseModel):
    role: str = Field(pattern="^(customer|driver|admin)$")


class AdminSystemHealthRead(BaseModel):
    status: str
    server_time: datetime
    uptime_seconds: float
    db_status: str
    db_size_mb: float
    disk_total_gb: float
    disk_used_gb: float
    disk_free_gb: float
    python_version: str
    platform: str
    warnings: list[str]


class ServiceMetadataCreate(BaseModel):
    title: str = Field(min_length=2, max_length=100)
    description: str
    vehicle_type: str = "car"
    service_mode: str = "Instant Ride"
    vehicle_model: str | None = None
    icon_name: str = "Car"
    tag_highlight: str | None = None
    color_scheme: str = "from-emerald-400 to-emerald-600"
    display_order: int = 0
    is_active: bool = True


class ServiceMetadataUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    vehicle_type: str | None = None
    service_mode: str | None = None
    vehicle_model: str | None = None
    icon_name: str | None = None
    tag_highlight: str | None = None
    color_scheme: str | None = None
    display_order: int | None = None
    is_active: bool | None = None


class ServiceMetadataRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    description: str
    vehicle_type: str
    service_mode: str
    vehicle_model: str | None = None
    icon_name: str
    tag_highlight: str | None = None
    color_scheme: str
    display_order: int
    is_active: bool
    created_at: datetime

