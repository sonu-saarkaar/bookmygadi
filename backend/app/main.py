from collections import defaultdict, deque
import time

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.auth import router as auth_router
from app.api.admin import router as admin_router
from app.api.admin_enterprise import router as admin_enterprise_router
from app.api.pricing import router as pricing_router
from app.api.payment import router as payment_router
from app.api.realtime import realtime_manager
from app.api.rider import router as rider_router
from app.api.rides import router as rides_router
from app.api.services import router as services_router
from app.api.system import router as system_router
from app.api.vehicles import router as vehicles_router
from app.api.radar import router as radar_router
from app.api.crm import router as crm_router
from app.api.users_mgmt import router as users_mgmt_router
from app.admin_panel import admin_app_router
from app.core.config import settings
from app.core.db_backup import create_sqlite_backup
from app.core.security import get_password_hash
from app.db import Base, engine
from app.models import User, VehicleInventory
from sqlalchemy import text
from sqlalchemy.orm import Session


# Keep a point-in-time copy before runtime migrations or seeding touches the DB.
create_sqlite_backup(settings.database_url)
Base.metadata.create_all(bind=engine)


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
        if ride_cols and "requested_fare" not in ride_col_names:
            conn.execute(text("ALTER TABLE rides ADD COLUMN requested_fare INTEGER"))

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


ensure_schema_updates()
ensure_reserve_price_columns()


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

        # Generate stable platform IDs (BMG-USER/BMG-RIDER/BMG-ADMIN).
        users = db.query(User).order_by(User.created_at.asc()).all()
        counters = {"customer": 0, "driver": 0, "admin": 0}
        existing_ids = {u.public_id for u in users if u.public_id}
        for pid in existing_ids:
            try:
                part = str(pid).split("-")
                if len(part) != 3:
                    continue
                kind, num = part[1], int(part[2])
                if kind == "USER":
                    counters["customer"] = max(counters["customer"], num)
                elif kind == "RIDER":
                    counters["driver"] = max(counters["driver"], num)
                elif kind == "ADMIN":
                    counters["admin"] = max(counters["admin"], num)
            except Exception:
                continue
        for u in users:
            if u.role not in counters:
                continue
            if u.public_id:
                continue
            counters[u.role] += 1
            prefix = "USER" if u.role == "customer" else "RIDER" if u.role == "driver" else "ADMIN"
            candidate = f"BMG-{prefix}-{counters[u.role]:03d}"
            while candidate in existing_ids:
                counters[u.role] += 1
                candidate = f"BMG-{prefix}-{counters[u.role]:03d}"
            u.public_id = candidate
            existing_ids.add(candidate)
        db.commit()


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


seed_services()

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_rate_buckets: dict[str, deque] = defaultdict(deque)


@app.middleware("http")
async def basic_rate_limiter(request: Request, call_next):
    path = request.url.path or ""
    protected = path.startswith(f"{settings.api_prefix}/auth") or path.startswith(f"{settings.api_prefix}/admin")
    if protected:
        key = f"{request.client.host if request.client else 'unknown'}:{path}"
        now = time.time()
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


@app.websocket("/ws/rides/{ride_id}")
async def ride_ws(websocket: WebSocket, ride_id: str):
    await realtime_manager.connect(ride_id, websocket)
    try:
        while True:
            _ = await websocket.receive_text()
    except WebSocketDisconnect:
        realtime_manager.disconnect(ride_id, websocket)

