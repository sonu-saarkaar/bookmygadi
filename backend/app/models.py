import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    bio: Mapped[str | None] = mapped_column(String(500), nullable=True)
    emergency_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    avatar_data: Mapped[str | None] = mapped_column(Text, nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default="customer")
    status: Mapped[str] = mapped_column(String(40), default="active") # active, verified, blocked, dummy
    is_blocked: Mapped[bool] = mapped_column(Boolean, default=False)
    blocked_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    driver_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    fcm_token: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    total_rides: Mapped[int] = mapped_column(Integer, default=0)
    total_spending: Mapped[float] = mapped_column(Float, default=0.0)
    last_active_at: Mapped[datetime | None] = mapped_column(DateTime, default=datetime.utcnow)
    referral_source: Mapped[str | None] = mapped_column(String(100), nullable=True)

    vehicle_registrations: Mapped[list["RiderVehicleRegistration"]] = relationship(
        "RiderVehicleRegistration",
        primaryjoin="User.id == RiderVehicleRegistration.driver_id",
        viewonly=True
    )


class Ride(Base, TimestampMixin):
    __tablename__ = "rides"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    customer_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    driver_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    pickup_location: Mapped[str] = mapped_column(String(255))
    destination: Mapped[str] = mapped_column(String(255))
    vehicle_type: Mapped[str] = mapped_column(String(40), default="car")
    status: Mapped[str] = mapped_column(String(40), default="pending")
    estimated_fare_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    estimated_fare_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    agreed_fare: Mapped[int | None] = mapped_column(Integer, nullable=True)
    requested_fare: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pickup_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    pickup_lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    destination_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    destination_lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    start_otp: Mapped[str | None] = mapped_column(String(10), nullable=True)
    payment_status: Mapped[str] = mapped_column(String(20), default="unpaid")
    driver_live_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    driver_live_lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    customer_live_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    customer_live_lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    arrived_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    messages: Mapped[list["RideMessage"]] = relationship(
        back_populates="ride",
        cascade="all, delete-orphan",
    )
    customer: Mapped["User"] = relationship(foreign_keys=[customer_id])
    driver: Mapped["User | None"] = relationship(foreign_keys=[driver_id])
    negotiations: Mapped[list["RideNegotiation"]] = relationship(
        back_populates="ride",
        cascade="all, delete-orphan",
    )
    preference: Mapped["RidePreference | None"] = relationship(
        back_populates="ride",
        cascade="all, delete-orphan",
        uselist=False,
    )

    @property
    def driver_name(self) -> str | None:
        return self.driver.name if self.driver else None

    @property
    def driver_phone(self) -> str | None:
        return self.driver.phone if self.driver else None

    @property
    def driver_vehicle_details(self) -> dict | None:
        if not self.driver or not self.driver.vehicle_registrations:
            return None
        v = self.driver.vehicle_registrations[0]
        return {
            "model": v.brand_model,
            "number": v.registration_number,
            "color": v.color or "Not Specified",
            "condition": v.vehicle_condition or "Normal",
            "seater": v.seater_count or 4
        }


class RidePreference(Base, TimestampMixin):
    __tablename__ = "ride_preferences"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    ride_id: Mapped[str] = mapped_column(ForeignKey("rides.id"), unique=True, index=True)
    trip_type: Mapped[str] = mapped_column(String(20), default="oneway")
    pickup_datetime: Mapped[str | None] = mapped_column(String(40), nullable=True)
    return_datetime: Mapped[str | None] = mapped_column(String(40), nullable=True)
    preferred_color: Mapped[str | None] = mapped_column(String(30), nullable=True)
    vehicle_condition: Mapped[str | None] = mapped_column(String(40), nullable=True)
    ac_required: Mapped[bool] = mapped_column(Boolean, default=True)
    seater_required: Mapped[int | None] = mapped_column(Integer, nullable=True)
    vehicle_model: Mapped[str | None] = mapped_column(String(80), nullable=True)
    urgency_type: Mapped[str] = mapped_column(String(20), default="ride")
    pickup_area: Mapped[str | None] = mapped_column(String(120), nullable=True)
    reserve_duration_hours: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reserve_radius_km: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reserve_quote_low: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reserve_quote_high: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reserve_price_source: Mapped[str | None] = mapped_column(String(30), nullable=True)
    reserve_distance_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    
    # New Reservation Specific Fields
    vehicle_count: Mapped[int] = mapped_column(Integer, default=1)
    advance_payment_status: Mapped[str] = mapped_column(String(20), default="pending") # pending, paid
    advance_amount: Mapped[int] = mapped_column(Integer, default=0)
    market_rate: Mapped[int | None] = mapped_column(Integer, nullable=True)
    booking_mode: Mapped[str] = mapped_column(String(30), default="normal") # quick, normal, emergency
    supervisor_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    supervisor_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)

    ride: Mapped[Ride] = relationship(back_populates="preference")


class VehicleInventory(Base, TimestampMixin):
    __tablename__ = "vehicle_inventory"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    model_name: Mapped[str] = mapped_column(String(80))
    vehicle_type: Mapped[str] = mapped_column(String(40), default="car")
    color: Mapped[str] = mapped_column(String(30), default="White")
    vehicle_condition: Mapped[str] = mapped_column(String(40), default="good")
    has_ac: Mapped[bool] = mapped_column(Boolean, default=True)
    seater_count: Mapped[int] = mapped_column(Integer, default=4)
    area: Mapped[str] = mapped_column(String(120), index=True)
    live_location: Mapped[str] = mapped_column(String(255), default="Unknown")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)


class RideMessage(Base, TimestampMixin):
    __tablename__ = "ride_messages"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    ride_id: Mapped[str] = mapped_column(ForeignKey("rides.id"), index=True)
    sender_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    sender_type: Mapped[str] = mapped_column(String(20), default="customer")
    message: Mapped[str] = mapped_column(Text)

    ride: Mapped[Ride] = relationship(back_populates="messages")


class RideNegotiation(Base, TimestampMixin):
    __tablename__ = "ride_negotiations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    ride_id: Mapped[str] = mapped_column(ForeignKey("rides.id"), index=True)
    offered_by: Mapped[str] = mapped_column(String(20), default="customer")
    driver_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    amount: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), default="pending")

    ride: Mapped[Ride] = relationship(back_populates="negotiations")


class RiderApiKey(Base, TimestampMixin):
    __tablename__ = "rider_api_keys"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    key_prefix: Mapped[str] = mapped_column(String(24), unique=True, index=True)
    key_hash: Mapped[str] = mapped_column(String(128))
    label: Mapped[str | None] = mapped_column(String(120), nullable=True)
    driver_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class RideFeedback(Base, TimestampMixin):
    __tablename__ = "ride_feedback"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    ride_id: Mapped[str] = mapped_column(ForeignKey("rides.id"), unique=True, index=True)
    customer_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    rating: Mapped[int] = mapped_column(Integer, default=5)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)


class RoutePriceRule(Base, TimestampMixin):
    __tablename__ = "route_price_rules"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    pickup_area: Mapped[str] = mapped_column(String(150), index=True)
    destination_area: Mapped[str] = mapped_column(String(150), index=True)
    base_km: Mapped[float] = mapped_column(Float, default=5.0)
    base_fare: Mapped[int] = mapped_column(Integer, default=120)
    per_km_rate: Mapped[float] = mapped_column(Float, default=16.0)
    min_fare: Mapped[int] = mapped_column(Integer, default=100)
    max_multiplier: Mapped[float] = mapped_column(Float, default=1.25)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class VehiclePriceModifier(Base, TimestampMixin):
    __tablename__ = "vehicle_price_modifiers"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    vehicle_type: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    multiplier: Mapped[float] = mapped_column(Float, default=1.0)
    flat_adjustment: Mapped[int] = mapped_column(Integer, default=0)
    min_fare_floor: Mapped[int] = mapped_column(Integer, default=80)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class RiderSchedule(Base, TimestampMixin):
    __tablename__ = "rider_schedule"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    driver_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    ride_date: Mapped[date] = mapped_column(Date, index=True)
    pickup_time: Mapped[str | None] = mapped_column(String(20), nullable=True)
    pickup_location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    destination: Mapped[str | None] = mapped_column(String(255), nullable=True)
    vehicle_type: Mapped[str] = mapped_column(String(40), default="car")
    fare: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="scheduled")


class RiderVehicleRegistration(Base, TimestampMixin):
    __tablename__ = "rider_vehicle_registrations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    driver_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    vehicle_type: Mapped[str] = mapped_column(String(40), default="car")
    brand_model: Mapped[str] = mapped_column(String(120))
    registration_number: Mapped[str] = mapped_column(String(40), index=True)
    color: Mapped[str | None] = mapped_column(String(30), nullable=True)
    seater_count: Mapped[int] = mapped_column(Integer, default=4)
    vehicle_condition: Mapped[str | None] = mapped_column(String(40), nullable=True)
    area: Mapped[str | None] = mapped_column(String(120), nullable=True)
    rc_number: Mapped[str | None] = mapped_column(String(60), nullable=True)
    insurance_number: Mapped[str | None] = mapped_column(String(60), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    admin_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    approved_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    vehicle_category: Mapped[str | None] = mapped_column(String(40), nullable=True)
    service_type: Mapped[str | None] = mapped_column(String(40), nullable=True)
    model_year: Mapped[str | None] = mapped_column(String(20), nullable=True)
    has_ac: Mapped[bool | None] = mapped_column(Boolean, default=True, nullable=True)
    has_music: Mapped[bool | None] = mapped_column(Boolean, default=False, nullable=True)
    owner_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    owner_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    owner_email: Mapped[str | None] = mapped_column(String(120), nullable=True)
    owner_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_owner_driver: Mapped[bool | None] = mapped_column(Boolean, default=True, nullable=True)
    driver_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    driver_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    driver_calling_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    driver_dl_number: Mapped[str | None] = mapped_column(String(60), nullable=True)
    rider_id_format: Mapped[str | None] = mapped_column(String(20), nullable=True, unique=True)


class ReserveRoutePrice(Base, TimestampMixin):
    __tablename__ = "reserve_route_prices"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    driver_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    route_from: Mapped[str] = mapped_column(String(120), index=True)
    route_to: Mapped[str] = mapped_column(String(120), index=True)
    vehicle_type: Mapped[str] = mapped_column(String(40), default="car", index=True)
    price_12h: Mapped[int] = mapped_column(Integer)
    price_24h: Mapped[int] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class ReserveDefaultRate(Base, TimestampMixin):
    __tablename__ = "reserve_default_rates"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    route_from: Mapped[str] = mapped_column(String(120), default="*")
    route_to: Mapped[str] = mapped_column(String(120), default="*")
    vehicle_type: Mapped[str] = mapped_column(String(40), default="car", index=True)
    duration_hours: Mapped[int] = mapped_column(Integer, default=12)
    default_min_price: Mapped[int] = mapped_column(Integer, default=2200)
    default_max_price: Mapped[int] = mapped_column(Integer, default=4200)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class ServiceMetadata(Base, TimestampMixin):
    __tablename__ = "service_metadata"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(Text)
    vehicle_type: Mapped[str] = mapped_column(String(40))
    service_mode: Mapped[str] = mapped_column(String(20), default="Instant Ride") # Instant Ride, reserve
    vehicle_model: Mapped[str | None] = mapped_column(String(80), nullable=True) # Swift, Wedding Special, etc.
    icon_name: Mapped[str] = mapped_column(String(40), default="Car") # Lucide icon name
    tag_highlight: Mapped[str | None] = mapped_column(String(40), nullable=True) # Popular, Best Value
    color_scheme: Mapped[str] = mapped_column(String(100), default="from-emerald-400 to-emerald-600")
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class AdminSupportTicket(Base, TimestampMixin):
    __tablename__ = "admin_support_tickets"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(40), default="general")
    severity: Mapped[str] = mapped_column(String(20), default="medium")
    status: Mapped[str] = mapped_column(String(20), default="open")
    assigned_to: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(120), nullable=True)
    # Extended ride context
    ride_id: Mapped[str | None] = mapped_column(String, nullable=True)
    reporter_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    reporter_role: Mapped[str | None] = mapped_column(String(20), nullable=True)
    pickup_location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    drop_location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    pickup_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    pickup_lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    # Admin actions
    admin_response: Mapped[str | None] = mapped_column(Text, nullable=True)
    emergency_dispatched: Mapped[str | None] = mapped_column(String(40), nullable=True)  # police|ambulance|fire|team
    assigned_vehicle_id: Mapped[str | None] = mapped_column(String, nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(nullable=True)


class AdminTask(Base, TimestampMixin):
    __tablename__ = "admin_tasks"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(160))
    type: Mapped[str] = mapped_column(String(40), default="ops")
    priority: Mapped[str] = mapped_column(String(20), default="medium")
    status: Mapped[str] = mapped_column(String(20), default="todo")
    assignee_admin_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)


class AdminAuditLog(Base, TimestampMixin):
    __tablename__ = "admin_audit_logs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    module: Mapped[str] = mapped_column(String(40), default="admin")
    action: Mapped[str] = mapped_column(String(200))
    admin_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    admin_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    admin_role: Mapped[str | None] = mapped_column(String(40), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="success")


# CRM Models

class CRMTeamMember(Base, TimestampMixin):
    __tablename__ = "team_members"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    role: Mapped[str] = mapped_column(String(40), default="TEAM MEMBER") # SUPER ADMIN, ADMIN, TEAM MEMBER


class CRMDriver(Base, TimestampMixin):
    __tablename__ = "drivers"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(20))
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    vehicle_type: Mapped[str] = mapped_column(String(40), default="car")
    brand_model: Mapped[str] = mapped_column(String(120))
    registration_number: Mapped[str] = mapped_column(String(40))
    
    license_number: Mapped[str | None] = mapped_column(String(60), nullable=True)
    rc_number: Mapped[str | None] = mapped_column(String(60), nullable=True)
    insurance_number: Mapped[str | None] = mapped_column(String(60), nullable=True)
    
    status: Mapped[str] = mapped_column(String(40), default="NEW")
    assigned_member_id: Mapped[str | None] = mapped_column(ForeignKey("team_members.id"), nullable=True)
    
    blocked_by: Mapped[str | None] = mapped_column(String(120), nullable=True)
    blocked_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    blocked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    assignments: Mapped[list["CRMDriverAssignment"]] = relationship("CRMDriverAssignment", back_populates="driver", cascade="all, delete-orphan")
    logs: Mapped[list["CRMDriverLog"]] = relationship("CRMDriverLog", back_populates="driver", cascade="all, delete-orphan")
    referral: Mapped["CRMReferral | None"] = relationship("CRMReferral", back_populates="driver", uselist=False, cascade="all, delete-orphan")


class CRMDriverAssignment(Base, TimestampMixin):
    __tablename__ = "driver_assignments"
    
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    driver_id: Mapped[str] = mapped_column(ForeignKey("drivers.id"))
    assigned_by: Mapped[str] = mapped_column(ForeignKey("team_members.id"))
    assigned_to: Mapped[str] = mapped_column(ForeignKey("team_members.id"))

    driver: Mapped[CRMDriver] = relationship("CRMDriver", back_populates="assignments")


class CRMDriverLog(Base, TimestampMixin):
    __tablename__ = "driver_logs"
    
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    driver_id: Mapped[str] = mapped_column(ForeignKey("drivers.id"))
    action: Mapped[str] = mapped_column(String(255))
    changed_by_name: Mapped[str] = mapped_column(String(120), default="System")

    driver: Mapped[CRMDriver] = relationship("CRMDriver", back_populates="logs")


class CRMReferral(Base, TimestampMixin):
    __tablename__ = "referrals"
    
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    driver_id: Mapped[str] = mapped_column(ForeignKey("drivers.id"), unique=True)
    referral_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    referral_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    referral_type: Mapped[str] = mapped_column(String(40))

    driver: Mapped[CRMDriver] = relationship("CRMDriver", back_populates="referral")

# --- User Management Extensions ---

class Coupon(Base, TimestampMixin):
    __tablename__ = "coupons"
    
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    discount_amount: Mapped[float] = mapped_column(Float, default=0.0)
    discount_type: Mapped[str] = mapped_column(String(20), default="flat") # flat, percentage
    max_uses: Mapped[int] = mapped_column(Integer, default=1)
    expiry_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    
class UserCoupon(Base, TimestampMixin):
    __tablename__ = "user_coupons"
    
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    coupon_id: Mapped[str] = mapped_column(ForeignKey("coupons.id"))
    is_used: Mapped[bool] = mapped_column(Boolean, default=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

class UserReferral(Base, TimestampMixin):
    __tablename__ = "user_referrals"
    
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    inviter_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    invitee_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True)
    reward_amount: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(40), default="pending") # pending, rewarded
