from collections import defaultdict, deque
from datetime import datetime
import json
import time

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.limiter import limiter
import logging
from fastapi.responses import JSONResponse

from app.api.common.auth import router as auth_router
from app.api.admin.admin import router as admin_router
from app.api.admin.admin_enterprise import router as admin_enterprise_router
from app.api.admin.ops_console import router as ops_console_router
from app.api.user.pricing import router as pricing_router
from app.api.user.payment import router as payment_router
from app.api.common.realtime import realtime_manager
from app.api.rider.rider import router as rider_router
from app.api.user.rides import router as rides_router
from app.api.user.services import router as services_router
from app.api.common.system import router as system_router
from app.api.user.vehicles import router as vehicles_router
from app.api.user.radar import router as radar_router
from app.api.admin.crm import router as crm_router
from app.api.admin.users_mgmt import router as users_mgmt_router
from app.admin_panel import admin_app_router
from app.admin_system.routes import router as parallel_admin_router
from app.ride_intelligence.routes import router as ride_intelligence_router
from app.ride_intelligence.websockets import router as ride_intelligence_ws_router
from app.enterprise.routes import router as enterprise_router
from app.distributed_platform.routes import router as distributed_platform_router
from app.pricing_engine.routes import router as pricing_engine_router
from app.admin_system.middlewares import AdminAuditMiddleware, SecureUploadMiddleware
from app.core.config import settings
from app.core.db_backup import create_sqlite_backup
from app.core.ids import next_request_public_id, next_ride_public_id, next_rider_public_id, next_search_public_id, next_user_public_id, public_payment_id
from app.core.security import decode_access_token, get_password_hash
from app.db import Base, engine
from app.models import Ride, RideSearchEvent, RiderVehicleRegistration, User, VehicleInventory
from sqlalchemy import text
from sqlalchemy.orm import Session


# Keep a point-in-time copy before runtime migrations or seeding touches the DB.
create_sqlite_backup(settings.database_url)
Base.metadata.create_all(bind=engine)

if settings.app_env.lower() == "production" and settings.secret_key == "change-me-in-production":
    raise RuntimeError("SECRET_KEY must be configured in production.")


def ensure_schema_updates() -> None:
    # Lightweight runtime migration for existing SQLite DBs without Alembic.
    with engine.begin() as conn:
        cols = conn.execute(text("PRAGMA table_info(ride_negotiations)")).fetchall()
        col_names = {row[1] for row in cols}
        if cols and "driver_id" not in col_names:
            conn.execute(text("ALTER TABLE ride_negotiations ADD COLUMN driver_id VARCHAR"))

        ride_cols = conn.execute(text("PRAGMA table_info(rides)")).fetchall()
        ride_col_names = {row[1] for row in ride_cols}
        if ride_cols and "start_otp" not in ride_col_names:
            conn.execute(text("ALTER TABLE rides ADD COLUMN start_otp VARCHAR"))
        if ride_cols and "payment_status" not in ride_col_names:
            conn.execute(text("ALTER TABLE rides ADD COLUMN payment_status VARCHAR DEFAULT 'unpaid'"))
        if ride_cols and "driver_live_lat" not in ride_col_names:
            conn.execute(text("ALTER TABLE rides ADD COLUMN driver_live_lat FLOAT"))
        if ride_cols and "driver_live_lng" not in ride_col_names:
            conn.execute(text("ALTER TABLE rides ADD COLUMN driver_live_lng FLOAT"))
        if ride_cols and "customer_live_lat" not in ride_col_names:
            conn.execute(text("ALTER TABLE rides ADD COLUMN customer_live_lat FLOAT"))
        if ride_cols and "customer_live_lng" not in ride_col_names:
            conn.execute(text("ALTER TABLE rides ADD COLUMN customer_live_lng FLOAT"))
        if ride_cols and "driver_live_accuracy" not in ride_col_names:
            conn.execute(text("ALTER TABLE rides ADD COLUMN driver_live_accuracy FLOAT"))
        if ride_cols and "driver_live_heading" not in ride_col_names:
            conn.execute(text("ALTER TABLE rides ADD COLUMN driver_live_heading FLOAT"))
        if ride_cols and "driver_live_updated_at" not in ride_col_names:
            conn.execute(text("ALTER TABLE rides ADD COLUMN driver_live_updated_at DATETIME"))
        if ride_cols and "customer_live_accuracy" not in ride_col_names:
            conn.execute(text("ALTER TABLE rides ADD COLUMN customer_live_accuracy FLOAT"))
        if ride_cols and "customer_live_heading" not in ride_col_names:
            conn.execute(text("ALTER TABLE rides ADD COLUMN customer_live_heading FLOAT"))
        if ride_cols and "customer_live_updated_at" not in ride_col_names:
            conn.execute(text("ALTER TABLE rides ADD COLUMN customer_live_updated_at DATETIME"))
        if ride_cols and "requested_fare" not in ride_col_names:
            conn.execute(text("ALTER TABLE rides ADD COLUMN requested_fare INTEGER"))
        if ride_cols and "public_id" not in ride_col_names:
            conn.execute(text("ALTER TABLE rides ADD COLUMN public_id VARCHAR(30)"))
        if ride_cols and "payment_public_id" not in ride_col_names:
            conn.execute(text("ALTER TABLE rides ADD COLUMN payment_public_id VARCHAR(30)"))

        pref_cols = conn.execute(text("PRAGMA table_info(ride_preferences)")).fetchall()
        pref_col_names = {row[1] for row in pref_cols}
        if pref_cols and "reserve_duration_hours" not in pref_col_names:
            conn.execute(text("ALTER TABLE ride_preferences ADD COLUMN reserve_duration_hours INTEGER"))
        if pref_cols and "reserve_radius_km" not in pref_col_names:
            conn.execute(text("ALTER TABLE ride_preferences ADD COLUMN reserve_radius_km INTEGER"))
        if pref_cols and "reserve_quote_low" not in pref_col_names:
            conn.execute(text("ALTER TABLE ride_preferences ADD COLUMN reserve_quote_low INTEGER"))
        if pref_cols and "reserve_quote_high" not in pref_col_names:
            conn.execute(text("ALTER TABLE ride_preferences ADD COLUMN reserve_quote_high INTEGER"))
        if pref_cols and "reserve_price_source" not in pref_col_names:
            conn.execute(text("ALTER TABLE ride_preferences ADD COLUMN reserve_price_source VARCHAR"))
        if pref_cols and "reserve_distance_km" not in pref_col_names:
            conn.execute(text("ALTER TABLE ride_preferences ADD COLUMN reserve_distance_km FLOAT"))
        if pref_cols and "vehicle_count" not in pref_col_names:
            conn.execute(text("ALTER TABLE ride_preferences ADD COLUMN vehicle_count INTEGER DEFAULT 1"))
        if pref_cols and "advance_payment_status" not in pref_col_names:
            conn.execute(text("ALTER TABLE ride_preferences ADD COLUMN advance_payment_status VARCHAR DEFAULT 'pending'"))
        if pref_cols and "advance_amount" not in pref_col_names:
            conn.execute(text("ALTER TABLE ride_preferences ADD COLUMN advance_amount INTEGER DEFAULT 0"))
        if pref_cols and "market_rate" not in pref_col_names:
            conn.execute(text("ALTER TABLE ride_preferences ADD COLUMN market_rate INTEGER"))
        if pref_cols and "booking_mode" not in pref_col_names:
            conn.execute(text("ALTER TABLE ride_preferences ADD COLUMN booking_mode VARCHAR DEFAULT 'normal'"))
        if pref_cols and "supervisor_name" not in pref_col_names:
            conn.execute(text("ALTER TABLE ride_preferences ADD COLUMN supervisor_name VARCHAR"))
        if pref_cols and "supervisor_phone" not in pref_col_names:
            conn.execute(text("ALTER TABLE ride_preferences ADD COLUMN supervisor_phone VARCHAR"))

        user_cols = conn.execute(text("PRAGMA table_info(users)")).fetchall()
        user_col_names = {row[1] for row in user_cols}
        if user_cols and "is_blocked" not in user_col_names:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_blocked BOOLEAN DEFAULT 0"))
        if user_cols and "driver_status" not in user_col_names:
            conn.execute(text("ALTER TABLE users ADD COLUMN driver_status VARCHAR"))
        if user_cols and "public_id" not in user_col_names:
            conn.execute(text("ALTER TABLE users ADD COLUMN public_id VARCHAR(30)"))

        reg_cols = conn.execute(text("PRAGMA table_info(rider_vehicle_registrations)")).fetchall()
        reg_col_names = {row[1] for row in reg_cols}
        if reg_cols and "request_public_id" not in reg_col_names:
            conn.execute(text("ALTER TABLE rider_vehicle_registrations ADD COLUMN request_public_id VARCHAR(30)"))

        search_cols = conn.execute(text("PRAGMA table_info(ride_search_events)")).fetchall()
        search_col_names = {row[1] for row in search_cols}
        if search_cols and "public_id" not in search_col_names:
            conn.execute(text("ALTER TABLE ride_search_events ADD COLUMN public_id VARCHAR(30)"))

        # Create service_metadata if not exists
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS service_metadata (
                id VARCHAR PRIMARY KEY,
                title VARCHAR(100) NOT NULL,
                description TEXT NOT NULL,
                vehicle_type VARCHAR(40) NOT NULL,
                service_mode VARCHAR(20) DEFAULT 'Instant Ride',
                vehicle_model VARCHAR(80),
                icon_name VARCHAR(40) DEFAULT 'Car',
                tag_highlight VARCHAR(40),
                color_scheme VARCHAR(100) DEFAULT 'from-emerald-400 to-emerald-600',
                display_order INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """))

        # Migrate admin_support_tickets with new fields
        ticket_cols = conn.execute(text("PRAGMA table_info(admin_support_tickets)")).fetchall()
        ticket_col_names = {row[1] for row in ticket_cols}
        if ticket_cols:
            for col, ctype in [
                ("ride_id", "VARCHAR"),
                ("reporter_phone", "VARCHAR(20)"),
                ("reporter_role", "VARCHAR(20)"),
                ("pickup_location", "VARCHAR(255)"),
                ("drop_location", "VARCHAR(255)"),
                ("pickup_lat", "FLOAT"),
                ("pickup_lng", "FLOAT"),
                ("admin_response", "TEXT"),
                ("emergency_dispatched", "VARCHAR(40)"),
                ("assigned_vehicle_id", "VARCHAR"),
                ("resolved_at", "DATETIME"),
            ]:
                if col not in ticket_col_names:
                    conn.execute(text(f"ALTER TABLE admin_support_tickets ADD COLUMN {col} {ctype}"))


def ensure_reserve_price_columns() -> None:
    """Add price_6h to reserve_route_prices if missing."""
    with engine.begin() as conn:
        cols = conn.execute(text("PRAGMA table_info(reserve_route_prices)")).fetchall()
        col_names = {row[1] for row in cols}
        if cols and "price_6h" not in col_names:
            conn.execute(text("ALTER TABLE reserve_route_prices ADD COLUMN price_6h INTEGER"))
        if cols and "price_24h" not in col_names:
            conn.execute(text("ALTER TABLE reserve_route_prices ADD COLUMN price_24h INTEGER"))


def ensure_performance_indexes() -> None:
    """Lightweight indexes for hot queries (SQLite + Postgres compatible DDL)."""
    with engine.begin() as conn:
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_rides_status_created ON rides (status, created_at)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_rides_driver_status ON rides (driver_id, status)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_rides_customer_created ON rides (customer_id, created_at)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_rides_public_id ON rides (public_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_users_public_id ON users (public_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_rider_vehicle_registrations_request_public_id ON rider_vehicle_registrations (request_public_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_ride_search_events_status_started ON ride_search_events (status, search_started_at)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_ride_search_events_public_id ON ride_search_events (public_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_users_role_driver_status ON users (role, driver_status)"))


ensure_schema_updates()
ensure_reserve_price_columns()
ensure_performance_indexes()


def backfill_public_ids() -> None:
    with Session(engine) as db:
        changed = False
        for user in db.query(User).order_by(User.created_at.asc()).all():
            if not user.public_id or str(user.public_id).startswith("BMG-"):
                user.public_id = next_user_public_id(db, User)
                changed = True

        for registration in db.query(RiderVehicleRegistration).order_by(RiderVehicleRegistration.created_at.asc()).all():
            if not registration.request_public_id:
                registration.request_public_id = next_request_public_id(db, RiderVehicleRegistration)
                changed = True
            if not registration.rider_id_format or not str(registration.rider_id_format).startswith("BMGR"):
                registration.rider_id_format = next_rider_public_id(db, RiderVehicleRegistration, registration.area)
                changed = True

        for ride in db.query(Ride).order_by(Ride.created_at.asc()).all():
            if not ride.public_id:
                ride.public_id = next_ride_public_id(db, Ride)
                changed = True
            if not ride.payment_public_id:
                ride.payment_public_id = public_payment_id(ride.public_id)
                changed = True

        for event in db.query(RideSearchEvent).order_by(RideSearchEvent.created_at.asc()).all():
            if not event.public_id or str(event.public_id).startswith("BMGRQ"):
                event.public_id = next_search_public_id(db, RideSearchEvent)
                changed = True

        if changed:
            db.commit()


backfill_public_ids()


def seed_demo_users() -> None:
    with Session(engine) as db:
        customer = db.query(User).filter(User.email == "sonu@gmail.com").first()
        if not customer:
            db.add(
                User(
                    name="Sonu",
                    email="sonu@gmail.com",
                    phone="9999999999",
                    role="customer",
                    password_hash=get_password_hash("123456"),
                )
            )

        admin = db.query(User).filter(User.email == "admin@bookmygadi.app").first()
        if not admin:
            db.add(
                User(
                    name="Admin",
                    email="admin@bookmygadi.app",
                    phone="8888888888",
                    role="admin",
                    password_hash=get_password_hash("admin123"),
                )
            )

        driver = db.query(User).filter(User.email == "driver@bookmygadi.com").first()
        if not driver:
            db.add(
                User(
                    name="Driver One",
                    email="driver@bookmygadi.com",
                    phone="7777777777",
                    role="driver",
                    password_hash=get_password_hash("driver123"),
                )
            )

        db.commit()

        # Backward compatibility for older default admin email.
        legacy_admin = db.query(User).filter(User.email == "admin@bookmygadi.com").first()
        if not legacy_admin:
            db.add(
                User(
                    name="Legacy Admin",
                    email="admin@bookmygadi.com",
                    phone="8888888888",
                    role="admin",
                    password_hash=get_password_hash("admin123"),
                )
            )
            db.commit()

        for u in db.query(User).order_by(User.created_at.asc()).all():
            if not u.public_id or str(u.public_id).startswith("BMG-"):
                u.public_id = next_user_public_id(db, User)
        db.commit()


if settings.app_env.lower() != "production":
    seed_demo_users()


def seed_demo_vehicles() -> None:
    with Session(engine) as db:
        existing_count = db.query(VehicleInventory).count()
        if existing_count > 0:
            return

        db.add_all(
            [
                VehicleInventory(
                    model_name="Scorpio",
                    vehicle_type="car",
                    color="White",
                    vehicle_condition="new",
                    has_ac=True,
                    seater_count=7,
                    area="Varanasi",
                    live_location="Lanka Gate, Varanasi",
                    is_active=True,
                ),
                VehicleInventory(
                    model_name="Bolero",
                    vehicle_type="car",
                    color="Black",
                    vehicle_condition="good",
                    has_ac=False,
                    seater_count=7,
                    area="Varanasi",
                    live_location="Assi Ghat, Varanasi",
                    is_active=True,
                ),
                VehicleInventory(
                    model_name="Swift Dzire",
                    vehicle_type="car",
                    color="Silver",
                    vehicle_condition="better",
                    has_ac=True,
                    seater_count=5,
                    area="Varanasi",
                    live_location="Cantt Station, Varanasi",
                    is_active=True,
                ),
            ]
        )
        db.commit()


if settings.app_env.lower() != "production":
    seed_demo_vehicles()


def seed_services() -> None:
    from app.models import ServiceMetadata
    import uuid
    with Session(engine) as db:
        if db.query(ServiceMetadata).count() < 7:
            # Clear old services to forcefully populate the new detailed ones
            db.query(ServiceMetadata).delete()
        else:
            return
        
        db.add_all([
            # ---- INSTANT RIDE SERVICES ----
            ServiceMetadata(
                id=str(uuid.uuid4()), title="Instant Ride Car", description="Comfortable city and outstation trips",
                vehicle_type="car", service_mode="Instant Ride", vehicle_model="Swift",
                icon_name="Car", tag_highlight="Best Value", color_scheme="from-emerald-400 to-emerald-600", display_order=1
            ),
            ServiceMetadata(
                id=str(uuid.uuid4()), title="Bike Ride", description="Fast and affordable commute for solo travellers",
                vehicle_type="bike", service_mode="Instant Ride", vehicle_model="Bike",
                icon_name="Bike", tag_highlight="Popular", color_scheme="from-amber-400 to-orange-500", display_order=2
            ),
            ServiceMetadata(
                id=str(uuid.uuid4()), title="Auto Ride", description="Economical 3-Wheeler and E-Rikhsaw for local markets",
                vehicle_type="auto", service_mode="Instant Ride", vehicle_model="Auto",
                icon_name="Navigation", tag_highlight="Eco-friendly", color_scheme="from-teal-400 to-teal-600", display_order=3
            ),
            ServiceMetadata(
                id=str(uuid.uuid4()), title="Mini Pickup", description="Light goods delivery within the city limits",
                vehicle_type="bolero", service_mode="Instant Ride", vehicle_model="Pickup",
                icon_name="Truck", tag_highlight="Fast Delivery", color_scheme="from-cyan-500 to-blue-600", display_order=4
            ),

            # ---- RESERVED SERVICES ----
            ServiceMetadata(
                id=str(uuid.uuid4()), title="General Outstation", description="Pre-booked cars for intercity travel and tours",
                vehicle_type="car", service_mode="reserve", vehicle_model="Swift",
                icon_name="MapPin", tag_highlight="Reliable", color_scheme="from-indigo-400 to-blue-600", display_order=5
            ),
            ServiceMetadata(
                id=str(uuid.uuid4()), title="Wedding & Events", description="Luxury car decoration for Dulha/Dulhan & Guests",
                vehicle_type="car", service_mode="reserve", vehicle_model="Wedding Special",
                icon_name="PartyPopper", tag_highlight="Premium", color_scheme="from-rose-500 to-pink-600", display_order=6
            ),
            ServiceMetadata(
                id=str(uuid.uuid4()), title="Logistics & Farming", description="Heavy duty vehicles for bulk shifting and farming tools",
                vehicle_type="bolero", service_mode="reserve", vehicle_model="Logistics",
                icon_name="Tractor", color_scheme="from-slate-700 to-slate-900", display_order=7
            )
        ])
        db.commit()


if settings.app_env.lower() != "production":
    seed_services()

if settings.app_env.lower() == "production":
    app = FastAPI(title=settings.app_name, docs_url=None, redoc_url=None, openapi_url=None)
else:
    app = FastAPI(title=settings.app_name)

from app.core.telemetry import setup_telemetry
setup_telemetry(app)

logging.basicConfig(level=logging.INFO)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError

@app.exception_handler(ValidationError)
async def pydantic_validation_exception_handler(request: Request, exc: ValidationError):
    logging.error(f"Pydantic Validation Error on {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=422,
        content={"success": False, "message": "Data validation error", "detail": "Internal schema mismatch"}
    )

@app.exception_handler(RequestValidationError)
async def request_validation_exception_handler(request: Request, exc: RequestValidationError):
    logging.error(f"Request Validation Error on {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=422,
        content={"success": False, "message": "Invalid request payload", "detail": exc.errors()}
    )

_origins = [
    "https://bookmygadi.app",
    "https://www.bookmygadi.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
_env_origins = [o for o in settings.cors_origins if o != "*"]
_final_origins = list(set(_origins + _env_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=_final_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    # Add a custom request ID to track logs securely
    import uuid
    response.headers["X-Request-ID"] = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    return response

@app.middleware("http")
async def cloudflare_real_ip_middleware(request: Request, call_next):
    """Ensure rate-limiters and logs see the true client IP passed by Cloudflare CDN."""
    cf_ip = request.headers.get("CF-Connecting-IP")
    # Only trust CF-Connecting-IP if the request comes from our local Nginx reverse proxy
    if cf_ip and request.client and request.client.host in ("127.0.0.1", "::1"):
        request.scope["client"] = (cf_ip, request.client.port)
    return await call_next(request)

_rate_buckets: dict[str, deque] = defaultdict(deque)
_ws_rate_buckets: dict[str, deque] = defaultdict(deque)
_ws_metrics: dict[str, dict[str, float | int | None]] = defaultdict(
    lambda: {
        "messages_in": 0,
        "messages_out": 0,
        "last_in_at": None,
        "last_out_at": None,
        "last_latency_ms": None,
    }
)


@app.middleware("http")
async def basic_rate_limiter(request: Request, call_next):
    path = request.url.path or ""
    client = request.client.host if request.client else "unknown"
    now = time.time()

    if path.startswith(f"{settings.api_prefix}/pricing/quote") or path.startswith(
        f"{settings.api_prefix}/pricing/reserve/quote"
    ):
        key = f"{client}:pricing"
        dq = _rate_buckets[key]
        while dq and now - dq[0] > 60:
            dq.popleft()
        if len(dq) >= 400:
            return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded. Please retry shortly."})
        dq.append(now)
        return await call_next(request)

    protected = path.startswith(f"{settings.api_prefix}/auth") or path.startswith(f"{settings.api_prefix}/admin")
    if protected:
        key = f"{client}:{path}"
        dq = _rate_buckets[key]
        while dq and now - dq[0] > 60:
            dq.popleft()
        if len(dq) >= 180:
            return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded. Please retry shortly."})
        dq.append(now)
    return await call_next(request)

app.include_router(system_router)
app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(admin_router, prefix=settings.api_prefix)
app.include_router(admin_enterprise_router, prefix=settings.api_prefix)
app.include_router(ops_console_router, prefix=settings.api_prefix)
app.include_router(services_router, prefix=settings.api_prefix)
app.include_router(rides_router, prefix=settings.api_prefix)
app.include_router(vehicles_router, prefix=settings.api_prefix)
app.include_router(radar_router, prefix=settings.api_prefix)
app.include_router(pricing_router, prefix=settings.api_prefix)
app.include_router(rider_router, prefix=settings.api_prefix)
app.include_router(payment_router, prefix=settings.api_prefix)
app.include_router(crm_router, prefix=settings.api_prefix)
app.include_router(users_mgmt_router, prefix=settings.api_prefix)
app.include_router(admin_app_router)
app.include_router(parallel_admin_router)
app.include_router(pricing_engine_router, prefix=f"{settings.api_prefix}/pricing")
app.include_router(ride_intelligence_router, prefix=f"{settings.api_prefix}/intelligence")
app.include_router(ride_intelligence_ws_router)
app.include_router(enterprise_router, prefix=f"{settings.api_prefix}/enterprise")
app.include_router(distributed_platform_router, prefix=f"{settings.api_prefix}/distributed")


def _extract_ws_token(websocket: WebSocket) -> str | None:
    auth_header = websocket.headers.get("authorization") or websocket.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header.split(" ", 1)[1].strip()
    return websocket.query_params.get("token")


def _distance_meters(a_lat: float, a_lng: float, b_lat: float, b_lng: float) -> float:
    from math import atan2, cos, radians, sin, sqrt

    r = 6371000.0
    dlat = radians(b_lat - a_lat)
    dlon = radians(b_lng - a_lng)
    aa = sin(dlat / 2) ** 2 + cos(radians(a_lat)) * cos(radians(b_lat)) * sin(dlon / 2) ** 2
    c = 2 * atan2(sqrt(aa), sqrt(1 - aa))
    return r * c


def _apply_ws_location_update(ride: Ride, actor: str, payload: dict) -> dict:
    lat = float(payload["lat"])
    lng = float(payload["lng"])
    accuracy = float(payload["accuracy"]) if payload.get("accuracy") is not None else None
    heading = float(payload["heading"]) if payload.get("heading") is not None else None
    if accuracy is not None and accuracy > 50:
        raise ValueError("weak_accuracy")

    ts_raw = payload.get("ts")
    observed_at = datetime.fromisoformat(ts_raw) if isinstance(ts_raw, str) and ts_raw else datetime.utcnow()

    prev_lat = ride.driver_live_lat if actor == "driver" else ride.customer_live_lat
    prev_lng = ride.driver_live_lng if actor == "driver" else ride.customer_live_lng
    prev_updated_at = ride.driver_live_updated_at if actor == "driver" else ride.customer_live_updated_at

    if prev_updated_at and observed_at <= prev_updated_at:
        raise ValueError("out_of_order")

    if prev_lat is not None and prev_lng is not None and prev_updated_at is not None:
        seconds = max((observed_at - prev_updated_at).total_seconds(), 0.001)
        speed_kmh = (_distance_meters(prev_lat, prev_lng, lat, lng) / seconds) * 3.6
        if speed_kmh > 180:
            raise ValueError("speed_jump")

    if actor == "driver":
        ride.driver_live_lat = lat
        ride.driver_live_lng = lng
        ride.driver_live_accuracy = accuracy
        ride.driver_live_heading = heading
        ride.driver_live_updated_at = observed_at
    else:
        ride.customer_live_lat = lat
        ride.customer_live_lng = lng
        ride.customer_live_accuracy = accuracy
        ride.customer_live_heading = heading
        ride.customer_live_updated_at = observed_at

    return {
        "event": "location_update",
        "type": "location_update",
        "ride_id": ride.id,
        "actor": actor,
        "lat": lat,
        "lng": lng,
        "accuracy": accuracy,
        "heading": heading,
        "ts": observed_at.isoformat(),
        "driver_live_lat": ride.driver_live_lat,
        "driver_live_lng": ride.driver_live_lng,
        "driver_live_accuracy": ride.driver_live_accuracy,
        "driver_live_heading": ride.driver_live_heading,
        "driver_live_updated_at": ride.driver_live_updated_at.isoformat() if ride.driver_live_updated_at else None,
        "customer_live_lat": ride.customer_live_lat,
        "customer_live_lng": ride.customer_live_lng,
        "customer_live_accuracy": ride.customer_live_accuracy,
        "customer_live_heading": ride.customer_live_heading,
        "customer_live_updated_at": ride.customer_live_updated_at.isoformat() if ride.customer_live_updated_at else None,
        "status": ride.status,
    }


@app.websocket("/ws/rider/{rider_id}")
async def websocket_rider_endpoint(websocket: WebSocket, rider_id: str):
    await realtime_manager.connect_rider(rider_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"Rider Echo: {data}")
    except WebSocketDisconnect:
        realtime_manager.disconnect_rider(rider_id, websocket)

@app.websocket("/ws/rides/{ride_id}")
async def ride_ws(websocket: WebSocket, ride_id: str):
    token = _extract_ws_token(websocket)
    if not token:
        await websocket.close(code=4401, reason="Missing token")
        return

    user_id = decode_access_token(token)
    if not user_id:
        await websocket.close(code=4401, reason="Invalid token")
        return

    with Session(engine) as db:
        ride = db.get(Ride, ride_id)
        user = db.get(User, user_id)
        if not ride or not user:
            await websocket.close(code=4404, reason="Ride or user not found")
            return
        if user.role != "admin" and user.id not in {ride.customer_id, ride.driver_id}:
            await websocket.close(code=4403, reason="Forbidden")
            return

    await realtime_manager.connect(ride_id, websocket)
    await realtime_manager.broadcast(
        ride_id,
        {
            "event": "presence",
            "type": "presence",
            "ride_id": ride_id,
            "user_id": user_id,
            "role": user.role,
            "connected_at": datetime.utcnow().isoformat(),
        },
    )
    try:
        while True:
            raw = await websocket.receive_text()
            now = time.time()
            rate_key = f"{ride_id}:{user_id}"
            dq = _ws_rate_buckets[rate_key]
            while dq and now - dq[0] > 10:
                dq.popleft()
            if len(dq) >= 30:
                await websocket.send_json({"event": "error", "detail": "WS rate limit exceeded"})
                continue
            dq.append(now)

            metrics = _ws_metrics[ride_id]
            metrics["messages_in"] = int(metrics["messages_in"] or 0) + 1
            metrics["last_in_at"] = now

            try:
                payload = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"event": "error", "detail": "Invalid JSON"})
                continue

            message_type = payload.get("type") or payload.get("event")
            if message_type == "ping":
                await websocket.send_json({"event": "pong", "ts": datetime.utcnow().isoformat()})
                continue

            if message_type not in {"driver_location", "customer_location"}:
                await websocket.send_json({"event": "ignored", "detail": "Unsupported event"})
                continue

            actor = "driver" if message_type == "driver_location" else "customer"
            with Session(engine) as db:
                ride = db.get(Ride, ride_id)
                user = db.get(User, user_id)
                if not ride or not user:
                    await websocket.send_json({"event": "error", "detail": "Ride or user missing"})
                    continue
                if actor == "driver" and user.role != "admin" and user.id != ride.driver_id:
                    await websocket.send_json({"event": "error", "detail": "Not allowed to update driver location"})
                    continue
                if actor == "customer" and user.role != "admin" and user.id != ride.customer_id:
                    await websocket.send_json({"event": "error", "detail": "Not allowed to update customer location"})
                    continue
                try:
                    outbound = _apply_ws_location_update(ride, actor, payload)
                except (KeyError, TypeError, ValueError) as exc:
                    await websocket.send_json({"event": "error", "detail": f"Invalid location payload: {exc}"})
                    continue
                db.commit()

            sent_at = time.time()
            metrics["messages_out"] = int(metrics["messages_out"] or 0) + 1
            metrics["last_out_at"] = sent_at
            if payload.get("ts"):
                try:
                    metrics["last_latency_ms"] = max(
                        0.0,
                        (datetime.utcnow() - datetime.fromisoformat(str(payload["ts"]))).total_seconds() * 1000,
                    )
                except Exception:
                    pass
            await realtime_manager.broadcast(ride_id, outbound)
    except WebSocketDisconnect:
        realtime_manager.disconnect(ride_id, websocket)

