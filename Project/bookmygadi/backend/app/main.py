from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.admin import router as admin_router
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
from app.core.security import get_password_hash
from app.db import Base, engine
from app.models import User, VehicleInventory
from sqlalchemy import text
from sqlalchemy.orm import Session


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


ensure_schema_updates()


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

        admin = db.query(User).filter(User.email == "admin@bookmygadi.com").first()
        if not admin:
            db.add(
                User(
                    name="Admin",
                    email="admin@bookmygadi.com",
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

app.include_router(system_router)
app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(admin_router, prefix=settings.api_prefix)
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

