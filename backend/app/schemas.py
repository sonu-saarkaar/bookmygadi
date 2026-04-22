from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class HealthResponse(BaseModel):
    status: str
    message: str
    database_path: str | None = None
    database_exists: bool | None = None
    users_count: int | None = None
    rides_count: int | None = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ForgotPasswordRequest(BaseModel):
    email_or_mobile: str

class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str | None = None
    password: str = Field(min_length=4, max_length=100)
    role: str = "customer"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
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


class RideTrackingRead(BaseModel):
    ride_id: str
    status: str
    pickup_location: str
    destination: str
    driver_live_lat: float | None = None
    driver_live_lng: float | None = None
    customer_live_lat: float | None = None
    customer_live_lng: float | None = None
    pickup_lat: float | None = None
    pickup_lng: float | None = None
    destination_lat: float | None = None
    destination_lng: float | None = None


class PaymentReceiveRead(BaseModel):
    ride_id: str
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
    created_at: datetime


class RiderActiveRideRead(BaseModel):
    id: str
    pickup_location: str
    destination: str
    vehicle_type: str
    status: str
    payment_status: str | None = None
    agreed_fare: int | None = None
    estimated_fare_min: int | None = None
    estimated_fare_max: int | None = None
    customer_name: str | None = None
    customer_phone: str | None = None
    accepted_at: datetime | None = None
    arrived_at: datetime | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime


class RoutePriceRuleCreate(BaseModel):
    pickup_area: str
    destination_area: str
    base_km: float = Field(default=5.0, ge=0.1)
    base_fare: int = Field(default=120, ge=0)
    per_km_rate: float = Field(default=16.0, ge=0)
    min_fare: int = Field(default=100, ge=0)
    max_multiplier: float = Field(default=1.25, ge=1.0)
    is_active: bool = True


class RoutePriceRuleUpdate(BaseModel):
    pickup_area: str | None = None
    destination_area: str | None = None
    base_km: float | None = Field(default=None, ge=0.1)
    base_fare: int | None = Field(default=None, ge=0)
    per_km_rate: float | None = Field(default=None, ge=0)
    min_fare: int | None = Field(default=None, ge=0)
    max_multiplier: float | None = Field(default=None, ge=1.0)
    is_active: bool | None = None


class RoutePriceRuleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    pickup_area: str
    destination_area: str
    base_km: float
    base_fare: int
    per_km_rate: float
    min_fare: int
    max_multiplier: float
    is_active: bool
    created_at: datetime
    updated_at: datetime

class AdminSupportTicketCreate(BaseModel):
    title: str = Field(min_length=3, max_length=160)
    description: str | None = None
    category: str = "general"
    severity: str = "medium"
    created_by: str | None = None
    ride_id: str | None = None
    reporter_phone: str | None = None
    reporter_role: str | None = None
    pickup_location: str | None = None
    drop_location: str | None = None
    pickup_lat: float | None = None
    pickup_lng: float | None = None

class AdminSupportTicketAssign(BaseModel):
    assignee_admin_id: str

class AdminSupportTicketStatusUpdate(BaseModel):
    status: str

class AdminTicketActionUpdate(BaseModel):
    admin_response: str | None = None
    emergency_dispatched: str | None = None
    assigned_vehicle_id: str | None = None
    assigned_to: str | None = None
    status: str | None = None

class AdminSupportTicketRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    description: str | None = None
    category: str
    severity: str
    status: str
    assigned_to: str | None = None
    created_by: str | None = None
    ride_id: str | None = None
    reporter_phone: str | None = None
    reporter_role: str | None = None
    pickup_location: str | None = None
    drop_location: str | None = None
    pickup_lat: float | None = None
    pickup_lng: float | None = None
    admin_response: str | None = None
    emergency_dispatched: str | None = None
    assigned_vehicle_id: str | None = None
    resolved_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

class AdminTaskCreate(BaseModel):
    title: str = Field(min_length=3, max_length=160)
    type: str = "ops"
    priority: str = "medium"
    details: str | None = None
    assignee_admin_id: str | None = None

class AdminTaskAssign(BaseModel):
    assignee_admin_id: str

class AdminTaskStatusUpdate(BaseModel):
    status: str

class AdminTaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    type: str
    priority: str
    status: str
    assignee_admin_id: str | None = None
    details: str | None = None
    created_at: datetime
    updated_at: datetime

class AdminAuditLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    module: str
    action: str
    admin_id: str | None = None
    admin_name: str | None = None
    admin_role: str | None = None
    status: str
    created_at: datetime


class VehiclePriceModifierCreate(BaseModel):
    vehicle_type: str
    multiplier: float = Field(default=1.0, ge=0)
    flat_adjustment: int = 0
    min_fare_floor: int = Field(default=80, ge=0)
    is_active: bool = True


class VehiclePriceModifierUpdate(BaseModel):
    multiplier: float | None = Field(default=None, ge=0)
    flat_adjustment: int | None = None
    min_fare_floor: int | None = Field(default=None, ge=0)
    is_active: bool | None = None


class VehiclePriceModifierRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    vehicle_type: str
    multiplier: float
    flat_adjustment: int
    min_fare_floor: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ReserveRoutePriceCreate(BaseModel):
    route_from: str
    route_to: str
    vehicle_type: str = "car"
    price_6h: int | None = Field(default=None, ge=1)
    price_12h: int = Field(ge=1)
    price_24h: int | None = Field(default=None, ge=1)
    is_active: bool = True


class ReserveRoutePriceUpdate(BaseModel):
    route_from: str | None = None
    route_to: str | None = None
    vehicle_type: str | None = None
    price_6h: int | None = Field(default=None, ge=1)
    price_12h: int | None = Field(default=None, ge=1)
    price_24h: int | None = Field(default=None, ge=1)
    is_active: bool | None = None


class ReserveRoutePriceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    driver_id: str
    route_from: str
    route_to: str
    vehicle_type: str
    price_6h: int
    price_12h: int
    price_24h: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ReserveDefaultRateCreate(BaseModel):
    route_from: str = "*"
    route_to: str = "*"
    vehicle_type: str = "car"
    duration_hours: int = Field(default=12, ge=5, le=72)
    default_min_price: int = Field(default=2200, ge=0)
    default_max_price: int = Field(default=4200, ge=0)
    is_active: bool = True


class ReserveDefaultRateUpdate(BaseModel):
    route_from: str | None = None
    route_to: str | None = None
    vehicle_type: str | None = None
    duration_hours: int | None = Field(default=None, ge=5, le=72)
    default_min_price: int | None = Field(default=None, ge=0)
    default_max_price: int | None = Field(default=None, ge=0)
    is_active: bool | None = None


class ReserveDefaultRateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    route_from: str
    route_to: str
    vehicle_type: str
    duration_hours: int
    default_min_price: int
    default_max_price: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ReserveQuoteRow(BaseModel):
    driver_id: str
    driver_name: str | None = None
    driver_phone: str | None = None
    route_from: str
    route_to: str
    quoted_price: int
    radius_km: int


class ReserveQuoteRead(BaseModel):
    route_from: str
    route_to: str
    duration_hours: int
    radius_km: int
    nearby_driver_count: int
    min_price: int
    max_price: int
    source: str
    rows: list[ReserveQuoteRow]


class PricingQuoteRead(BaseModel):
    pickup_area: str
    destination_area: str
    vehicle_type: str
    estimated_distance_km: float
    suggested_fare: int
    min_fare: int
    max_fare: int
    demand_multiplier: float
    vehicle_multiplier: float


class NearbyRiderRead(BaseModel):
    driver_id: str
    driver_name: str | None = None
    lat: float
    lng: float
    distance_km: float


class RoutePriceRuleBulkUpsert(BaseModel):
    rows: list[RoutePriceRuleCreate]


class RiderScheduleCreate(BaseModel):
    ride_date: date
    pickup_time: str | None = None
    pickup_location: str | None = None
    destination: str | None = None
    vehicle_type: str = "car"
    fare: int | None = Field(default=None, ge=0)
    notes: str | None = None


class RiderScheduleUpdate(BaseModel):
    ride_date: date | None = None
    pickup_time: str | None = None
    pickup_location: str | None = None
    destination: str | None = None
    vehicle_type: str | None = None
    fare: int | None = Field(default=None, ge=0)
    notes: str | None = None
    status: str | None = None


class RiderScheduleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    driver_id: str
    ride_date: date
    pickup_time: str | None = None
    pickup_location: str | None = None
    destination: str | None = None
    vehicle_type: str
    fare: int | None = None
    notes: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime


class RiderVehicleRegistrationCreate(BaseModel):
    vehicle_type: str = "car"
    brand_model: str = Field(min_length=2, max_length=120)
    registration_number: str = Field(min_length=4, max_length=40)
    color: str | None = None
    seater_count: int = Field(default=4, ge=1, le=14)
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
    customer_id: str
    customer_name: str | None = None
    customer_phone: str | None = None
    customer_email: str | None = None
    driver_id: str | None = None
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

