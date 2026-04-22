import hashlib
import hmac
import secrets
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_admin_user, decode_access_token
from app.api.realtime import realtime_manager
from app.core.config import settings
from app.core.notifications import (
    notify_ride_accepted,
    notify_driver_arriving,
    notify_ride_started,
    notify_ride_completed,
)
from app.db import get_db
from app.models import Ride, RideMessage, RideNegotiation, RiderApiKey, RiderSchedule, User
from app.schemas import (
    LocationUpdate,
    PaymentReceiveRead,
    RiderApiKeyCreate,
    RiderApiKeyRead,
    RiderActiveRideRead,
    RiderScheduleCreate,
    RiderScheduleRead,
    RiderScheduleUpdate,
    RiderActiveStatusUpdate,
    RiderRideAction,
    RiderRideRequest,
    RideMessageCreate,
    RideMessageRead,
    RideTrackingRead,
)

class EmbeddedDriverContext:
    def __init__(self, driver_id: str | None):
        self.driver_id = driver_id

RiderAuthType = RiderApiKey | EmbeddedDriverContext


router = APIRouter(prefix="/rider", tags=["rider"])
MAX_LOCATION_ACCURACY_METERS = 50.0
MAX_SPEED_KMH = 180.0


def _parse_flexible_datetime(raw: str | None) -> datetime | None:
    value = (raw or "").strip()
    if not value:
        return None
    formats = [
        "%d/%m/%Y, %I:%M %p",
        "%d/%m/%Y %I:%M %p",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M",
        "%Y-%m-%d %H:%M",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def _distance_meters(a_lat: float, a_lng: float, b_lat: float, b_lng: float) -> float:
    from math import atan2, cos, radians, sin, sqrt

    r = 6371000.0
    dlat = radians(b_lat - a_lat)
    dlon = radians(b_lng - a_lng)
    aa = sin(dlat / 2) ** 2 + cos(radians(a_lat)) * cos(radians(b_lat)) * sin(dlon / 2) ** 2
    c = 2 * atan2(sqrt(aa), sqrt(1 - aa))
    return r * c


def _validate_location_payload(ride: Ride, payload: LocationUpdate) -> tuple[float | None, datetime]:
    accuracy = payload.accuracy
    if accuracy is not None and accuracy > MAX_LOCATION_ACCURACY_METERS:
        raise HTTPException(status_code=422, detail="Location accuracy too weak")

    observed_at = payload.ts or datetime.utcnow()
    if (
        ride.driver_live_lat is not None
        and ride.driver_live_lng is not None
        and ride.driver_live_updated_at is not None
        and observed_at <= ride.driver_live_updated_at
    ):
        raise HTTPException(status_code=409, detail="Out-of-order location update")

    if (
        ride.driver_live_lat is not None
        and ride.driver_live_lng is not None
        and ride.driver_live_updated_at is not None
    ):
        seconds = max((observed_at - ride.driver_live_updated_at).total_seconds(), 0.001)
        distance_m = _distance_meters(ride.driver_live_lat, ride.driver_live_lng, payload.lat, payload.lng)
        speed_kmh = (distance_m / seconds) * 3.6
        if speed_kmh > MAX_SPEED_KMH:
            raise HTTPException(status_code=422, detail="Location jump rejected")

    return accuracy, observed_at


def _tracking_payload(ride: Ride) -> RideTrackingRead:
    return RideTrackingRead(
        ride_id=ride.id,
        status=ride.status,
        pickup_location=ride.pickup_location,
        destination=ride.destination,
        driver_live_lat=ride.driver_live_lat,
        driver_live_lng=ride.driver_live_lng,
        driver_live_accuracy=ride.driver_live_accuracy,
        driver_live_heading=ride.driver_live_heading,
        driver_live_updated_at=ride.driver_live_updated_at,
        customer_live_lat=ride.customer_live_lat,
        customer_live_lng=ride.customer_live_lng,
        customer_live_accuracy=ride.customer_live_accuracy,
        customer_live_heading=ride.customer_live_heading,
        customer_live_updated_at=ride.customer_live_updated_at,
        pickup_lat=ride.pickup_lat,
        pickup_lng=ride.pickup_lng,
        destination_lat=ride.destination_lat,
        destination_lng=ride.destination_lng,
    )


def _rider_request_payload(db: Session, ride: Ride) -> RiderRideRequest:
    latest = (
        db.query(RideNegotiation)
        .filter(RideNegotiation.ride_id == ride.id)
        .order_by(RideNegotiation.created_at.desc())
        .first()
    )
    return RiderRideRequest(
        id=ride.id,
        booking_display_id=ride.booking_display_id,
        pickup_location=ride.pickup_location,
        destination=ride.destination,
        vehicle_type=ride.vehicle_type,
        status=ride.status,
        estimated_fare_min=ride.estimated_fare_min,
        estimated_fare_max=ride.estimated_fare_max,
        agreed_fare=ride.agreed_fare,
        requested_fare=ride.requested_fare,
        latest_offer_amount=latest.amount if latest else None,
        latest_offer_by=latest.offered_by if latest else None,
        latest_offer_status=latest.status if latest else None,
        accepted_at=ride.accepted_at,
        arrived_at=ride.arrived_at,
        started_at=ride.started_at,
        completed_at=ride.completed_at,
        created_at=ride.created_at,
    )


def _active_ride_payload(db: Session, ride: Ride) -> RiderActiveRideRead:
    customer = db.get(User, ride.customer_id)
    return RiderActiveRideRead(
        id=ride.id,
        booking_display_id=ride.booking_display_id,
        pickup_location=ride.pickup_location,
        destination=ride.destination,
        vehicle_type=ride.vehicle_type,
        status=ride.status,
        payment_status=ride.payment_status,
        agreed_fare=ride.agreed_fare,
        estimated_fare_min=ride.estimated_fare_min,
        estimated_fare_max=ride.estimated_fare_max,
        customer_name=customer.name if customer else None,
        customer_phone=customer.phone if customer else None,
        accepted_at=ride.accepted_at,
        arrived_at=ride.arrived_at,
        started_at=ride.started_at,
        completed_at=ride.completed_at,
        preference=ride.preference,
        created_at=ride.created_at,
    )


def _reserve_window(ride: Ride) -> tuple[datetime, datetime] | None:
    if not ride.preference:
        return None
    if (ride.preference.urgency_type or "").lower() != "reserve":
        return None
    start = _parse_flexible_datetime(ride.preference.pickup_datetime) or ride.created_at
    hours = max(5, int(ride.preference.reserve_duration_hours or 0))
    end = start + timedelta(hours=hours)
    return start, end


def _hash_api_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


def _parse_ride_pickup_date(ride: Ride) -> date:
    raw = (ride.preference.pickup_datetime if ride.preference else None) or ""
    raw = raw.strip()
    if raw:
        formats = [
            "%d/%m/%Y, %I:%M %p",
            "%d/%m/%Y",
            "%Y-%m-%d",
            "%Y-%m-%d %H:%M:%S",
        ]
        for fmt in formats:
            try:
                return datetime.strptime(raw, fmt).date()
            except ValueError:
                continue
        try:
            return datetime.fromisoformat(raw).date()
        except ValueError:
            pass
    return ride.created_at.date()


def _validate_rider_api_key(
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
    authorization: str | None = Header(default=None, alias="Authorization"),
    db: Session = Depends(get_db)
) -> RiderApiKey | EmbeddedDriverContext:
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        try:
            from app.core.security import decode_access_token
            user_id = decode_access_token(token)
            if user_id:
                user = db.get(User, user_id)
                if user and user.role in ("driver", "admin"):
                    return EmbeddedDriverContext(driver_id=user.id)
        except Exception:
            pass

    if not x_api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing X-API-Key and Authorization")
    
    if hmac.compare_digest(x_api_key, settings.rider_app_api_key):
        driver = db.query(User).filter(User.email == settings.rider_default_driver_email).first()
        return EmbeddedDriverContext(driver_id=driver.id if driver else None)

    parts = x_api_key.split(".", 1)
    if len(parts) != 2:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key format")

    key_prefix = parts[0]
    api_key = db.query(RiderApiKey).filter(RiderApiKey.key_prefix == key_prefix, RiderApiKey.is_active.is_(True)).first()
    if not api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")

    incoming_hash = _hash_api_key(x_api_key)
    if not hmac.compare_digest(api_key.key_hash, incoming_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")
    return api_key


@router.post("/keys/generate", response_model=RiderApiKeyRead, status_code=status.HTTP_201_CREATED)
def generate_rider_api_key(
    payload: RiderApiKeyCreate,
    _: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> RiderApiKeyRead:
    key_prefix = f"rk_{secrets.token_hex(4)}"
    secret_part = secrets.token_urlsafe(24)
    raw_key = f"{key_prefix}.{secret_part}"

    key_row = RiderApiKey(
        key_prefix=key_prefix,
        key_hash=_hash_api_key(raw_key),
        label=payload.label,
        driver_id=payload.driver_id,
        is_active=True,
    )
    db.add(key_row)
    db.commit()

    return RiderApiKeyRead(key=raw_key, key_prefix=key_prefix, label=payload.label, driver_id=payload.driver_id)


@router.get("/requests", response_model=list[RiderRideRequest])
def list_rider_requests(
    api_key: RiderAuthType = Depends(_validate_rider_api_key),
    db: Session = Depends(get_db),
) -> list[RiderRideRequest]:
    blocked_dates: set[date] = set()
    if api_key.driver_id:
        blocked_rows = (
            db.query(RiderSchedule)
            .filter(
                RiderSchedule.driver_id == api_key.driver_id,
                RiderSchedule.status.in_(["scheduled", "blocked"]),
            )
            .all()
        )
        blocked_dates = {row.ride_date for row in blocked_rows}

    rows = (
        db.query(Ride)
        .options(selectinload(Ride.preference))
        .filter(Ride.status == "pending")
        .order_by(Ride.created_at.asc())
        .all()
    )
    out: list[RiderRideRequest] = []
    for row in rows:
        if blocked_dates:
            ride_date = _parse_ride_pickup_date(row)
            if ride_date in blocked_dates:
                continue
        latest = (
            db.query(RideNegotiation)
            .filter(RideNegotiation.ride_id == row.id)
            .order_by(RideNegotiation.created_at.desc())
            .first()
        )
        out.append(
            RiderRideRequest(
                id=row.id,
                booking_display_id=row.booking_display_id,
                pickup_location=row.pickup_location,
                destination=row.destination,
                vehicle_type=row.vehicle_type,
                status=row.status,
                estimated_fare_min=row.estimated_fare_min,
                estimated_fare_max=row.estimated_fare_max,
                agreed_fare=row.agreed_fare,
                requested_fare=row.requested_fare,
                latest_offer_amount=latest.amount if latest else None,
                latest_offer_by=latest.offered_by if latest else None,
                latest_offer_status=latest.status if latest else None,
                created_at=row.created_at,
            )
        )
    return out


@router.get("/schedule", response_model=list[RiderScheduleRead])
def list_rider_schedule(
    month: str | None = None,
    api_key: RiderAuthType = Depends(_validate_rider_api_key),
    db: Session = Depends(get_db),
) -> list[RiderScheduleRead]:
    if not api_key.driver_id:
        return []
    query = db.query(RiderSchedule).filter(RiderSchedule.driver_id == api_key.driver_id)
    if month:
        try:
            y, m = month.split("-")
            y_i = int(y)
            m_i = int(m)
            if m_i < 1 or m_i > 12:
                raise ValueError
            start = date(y_i, m_i, 1)
            end = date(y_i + 1, 1, 1) if m_i == 12 else date(y_i, m_i + 1, 1)
            query = query.filter(RiderSchedule.ride_date >= start, RiderSchedule.ride_date < end)
        except ValueError:
            raise HTTPException(status_code=400, detail="month must be YYYY-MM")
    return query.order_by(RiderSchedule.ride_date.asc(), RiderSchedule.pickup_time.asc()).all()


@router.post("/schedule", response_model=RiderScheduleRead, status_code=status.HTTP_201_CREATED)
def create_rider_schedule(
    payload: RiderScheduleCreate,
    api_key: RiderAuthType = Depends(_validate_rider_api_key),
    db: Session = Depends(get_db),
) -> RiderScheduleRead:
    if not api_key.driver_id:
        raise HTTPException(status_code=403, detail="API key is not linked to any driver")
    row = RiderSchedule(
        driver_id=api_key.driver_id,
        ride_date=payload.ride_date,
        pickup_time=payload.pickup_time,
        pickup_location=payload.pickup_location,
        destination=payload.destination,
        vehicle_type=payload.vehicle_type,
        fare=payload.fare,
        notes=payload.notes,
        status="scheduled",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.put("/schedule/{schedule_id}", response_model=RiderScheduleRead)
def update_rider_schedule(
    schedule_id: str,
    payload: RiderScheduleUpdate,
    api_key: RiderAuthType = Depends(_validate_rider_api_key),
    db: Session = Depends(get_db),
) -> RiderScheduleRead:
    if not api_key.driver_id:
        raise HTTPException(status_code=403, detail="API key is not linked to any driver")
    row = db.get(RiderSchedule, schedule_id)
    if not row:
        raise HTTPException(status_code=404, detail="Schedule not found")
    if row.driver_id != api_key.driver_id:
        raise HTTPException(status_code=403, detail="Not allowed")

    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return row


@router.post("/schedule/{schedule_id}/cancel", response_model=RiderScheduleRead)
def cancel_rider_schedule(
    schedule_id: str,
    api_key: RiderAuthType = Depends(_validate_rider_api_key),
    db: Session = Depends(get_db),
) -> RiderScheduleRead:
    if not api_key.driver_id:
        raise HTTPException(status_code=403, detail="API key is not linked to any driver")
    row = db.get(RiderSchedule, schedule_id)
    if not row:
        raise HTTPException(status_code=404, detail="Schedule not found")
    if row.driver_id != api_key.driver_id:
        raise HTTPException(status_code=403, detail="Not allowed")
    row.status = "cancelled"
    db.commit()
    db.refresh(row)
    return row


@router.get("/active", response_model=list[RiderActiveRideRead])
def list_active_rides(
    api_key: RiderAuthType = Depends(_validate_rider_api_key),
    db: Session = Depends(get_db),
) -> list[RiderActiveRideRead]:
    if not api_key.driver_id:
        return []

    rows = (
        db.query(Ride)
        .options(selectinload(Ride.preference))
        .filter(
            Ride.driver_id == api_key.driver_id,
            Ride.status.in_(["accepted", "arriving", "in_progress"]),
        )
        .order_by(Ride.created_at.desc())
        .all()
    )
    out: list[RiderActiveRideRead] = []
    for row in rows:
        out.append(_active_ride_payload(db, row))
    return out


@router.post("/requests/{ride_id}/accept", response_model=RiderRideRequest)
async def accept_rider_request(
    ride_id: str,
    payload: RiderRideAction,
    api_key: RiderAuthType = Depends(_validate_rider_api_key),
    db: Session = Depends(get_db),
) -> RiderRideRequest:
    ride = db.get(Ride, ride_id)
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    if ride.status != "pending":
        raise HTTPException(status_code=409, detail=f"Ride already {ride.status}")
    if not api_key.driver_id:
        raise HTTPException(status_code=403, detail="Driver account not linked. Please login again.")
    if api_key.driver_id:
        active_ride = (
            db.query(Ride)
            .filter(
                Ride.driver_id == api_key.driver_id,
                Ride.id != ride_id,
                Ride.status.in_(["accepted", "arriving", "in_progress"]),
            )
            .first()
        )
        if active_ride:
            raise HTTPException(status_code=409, detail="Finish current ride before accepting a new request")

    # prevent overlapping reserve bookings for the same driver
    incoming_window = _reserve_window(ride)
    if api_key.driver_id and incoming_window:
        start_a, end_a = incoming_window
        reserve_rows = (
            db.query(Ride)
            .filter(
                Ride.driver_id == api_key.driver_id,
                Ride.id != ride_id,
                Ride.status.in_(["accepted", "arriving", "in_progress"]),
            )
            .options(selectinload(Ride.preference))
            .all()
        )
        for row in reserve_rows:
            win = _reserve_window(row)
            if not win:
                continue
            start_b, end_b = win
            if max(start_a, start_b) < min(end_a, end_b):
                raise HTTPException(status_code=409, detail="Overlapping reserve booking not allowed for this driver")

    ride.status = "accepted"
    ride.driver_id = api_key.driver_id
    ride.accepted_at = datetime.utcnow()
    if payload.agreed_fare is not None:
        ride.agreed_fare = payload.agreed_fare

    db.commit()
    db.refresh(ride)
    response_payload = _rider_request_payload(db, ride)

    try:
        await realtime_manager.broadcast(
            ride.id,
            {"event": "ride_status_updated", "ride": response_payload.model_dump(mode="json")},
        )
    except Exception:
        # Acceptance must not fail if realtime fan-out is temporarily unavailable.
        pass
    
    # ── Push Notification ─────────────────────────────────────────
    # Send push to the user that their ride got accepted
    from app.core.notifications import notify_ride_accepted
    customer = db.get(User, ride.customer_id)
    if customer and customer.fcm_token:
        driver = db.get(User, ride.driver_id)
        driver_name = driver.name if driver else "Your driver"
        try:
            await notify_ride_accepted(customer.fcm_token, driver_name)
        except Exception:
            pass
    # ──────────────────────────────────────────────────────────────

    return response_payload


@router.post("/requests/{ride_id}/reject", response_model=RiderRideRequest)
async def reject_rider_request(
    ride_id: str,
    api_key: RiderAuthType = Depends(_validate_rider_api_key),
    db: Session = Depends(get_db),
) -> RiderRideRequest:
    ride = db.get(Ride, ride_id)
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    if ride.status != "pending":
        raise HTTPException(status_code=409, detail=f"Ride already {ride.status}")

    ride.status = "rejected"
    db.commit()
    db.refresh(ride)
    await realtime_manager.broadcast(ride.id, {"event": "ride_status_updated", "ride": RiderRideRequest.model_validate(ride).model_dump(mode="json")})
    return ride


@router.post("/requests/{ride_id}/negotiate", response_model=RiderRideRequest)
async def rider_counter_offer(
    ride_id: str,
    payload: RiderRideAction,
    api_key: RiderAuthType = Depends(_validate_rider_api_key),
    db: Session = Depends(get_db),
) -> RiderRideRequest:
    ride = db.get(Ride, ride_id)
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    if ride.status != "pending":
        raise HTTPException(status_code=409, detail=f"Ride already {ride.status}")
    if payload.agreed_fare is None:
        raise HTTPException(status_code=400, detail="agreed_fare is required for negotiation")

    db.query(RideNegotiation).filter(
        RideNegotiation.ride_id == ride_id,
        RideNegotiation.status == "pending",
    ).update({"status": "superseded"}, synchronize_session=False)

    row = RideNegotiation(
        ride_id=ride_id,
        offered_by="driver",
        driver_id=api_key.driver_id,
        amount=payload.agreed_fare,
        status="pending",
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    await realtime_manager.broadcast(
        ride.id,
        {
            "event": "ride_negotiation_created",
            "negotiation": {
                "id": row.id,
                "ride_id": row.ride_id,
                "offered_by": row.offered_by,
                "driver_id": row.driver_id,
                "amount": row.amount,
                "status": row.status,
                "created_at": row.created_at.isoformat(),
                "updated_at": row.updated_at.isoformat(),
            },
        },
    )

    return RiderRideRequest(
        id=ride.id,
        pickup_location=ride.pickup_location,
        destination=ride.destination,
        vehicle_type=ride.vehicle_type,
        status=ride.status,
        estimated_fare_min=ride.estimated_fare_min,
        estimated_fare_max=ride.estimated_fare_max,
        agreed_fare=ride.agreed_fare,
        requested_fare=ride.requested_fare,
        latest_offer_amount=row.amount,
        latest_offer_by=row.offered_by,
        latest_offer_status=row.status,
        created_at=ride.created_at,
    )


@router.post("/active/{ride_id}/status", response_model=RiderActiveRideRead)
async def update_active_ride_status(
    ride_id: str,
    payload: RiderActiveStatusUpdate,
    api_key: RiderAuthType = Depends(_validate_rider_api_key),
    db: Session = Depends(get_db),
) -> RiderActiveRideRead:
    if not api_key.driver_id:
        raise HTTPException(status_code=403, detail="API key is not linked to any driver")

    ride = db.get(Ride, ride_id)
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    if ride.driver_id != api_key.driver_id:
        raise HTTPException(status_code=403, detail="This ride is not assigned to your driver account")

    if payload.status == "in_progress":
        if not payload.start_otp:
            raise HTTPException(status_code=400, detail="start_otp is required to start ride")
        if (ride.start_otp or "") != payload.start_otp:
            raise HTTPException(status_code=400, detail="Invalid ride OTP")

    now = datetime.utcnow()
    if payload.status == "arriving" and ride.arrived_at is None:
        ride.arrived_at = now
    elif payload.status == "in_progress" and ride.started_at is None:
        ride.started_at = now
    elif payload.status == "completed":
        if ride.started_at is None:
            ride.started_at = now
        ride.completed_at = now

    ride.status = payload.status

    db.commit()
    db.refresh(ride)
    response_payload = _active_ride_payload(db, ride)
    try:
        await realtime_manager.broadcast(
            ride.id,
            {
                "event": "ride_status_updated",
                "ride": response_payload.model_dump(mode="json"),
            },
        )
    except Exception:
        pass

    # ── Push Notifications ────────────────────────────────────────────────
    customer = db.get(User, ride.customer_id)
    customer_fcm = getattr(customer, "fcm_token", None) if customer else None
    driver = db.get(User, ride.driver_id) if ride.driver_id else None
    driver_name = driver.name if driver else "Your driver"

    try:
        if payload.status == "arriving":
            await notify_driver_arriving(customer_fcm, driver_name)
        elif payload.status == "in_progress":
            await notify_ride_started(customer_fcm, ride.destination)
        elif payload.status == "completed":
            await notify_ride_completed(customer_fcm, float(ride.agreed_fare or 0))
    except Exception:
        pass
    # ─────────────────────────────────────────────────────────────────────

    return response_payload


@router.post("/active/{ride_id}/driver-location")
async def update_driver_location(
    ride_id: str,
    payload: LocationUpdate,
    api_key: RiderAuthType = Depends(_validate_rider_api_key),
    db: Session = Depends(get_db),
) -> dict:
    if not api_key.driver_id:
        raise HTTPException(status_code=403, detail="API key is not linked to any driver")
    ride = db.get(Ride, ride_id)
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    if ride.driver_id != api_key.driver_id:
        raise HTTPException(status_code=403, detail="This ride is not assigned to your driver account")

    accuracy, observed_at = _validate_location_payload(ride, payload)
    ride.driver_live_lat = payload.lat
    ride.driver_live_lng = payload.lng
    ride.driver_live_accuracy = accuracy
    ride.driver_live_heading = payload.heading
    ride.driver_live_updated_at = observed_at
    db.commit()

    # Broadcast instantly to all subscribers of this ride's WebSocket
    # so the passenger sees real-time movement without any polling delay
    await realtime_manager.broadcast(
        ride_id,
        {
            "event": "location_update",
            "type": "location_update",
            "actor": "driver",
            "lat": payload.lat,
            "lng": payload.lng,
            "accuracy": accuracy,
            "heading": payload.heading,
            "ts": observed_at.isoformat(),
            "ride_id": ride_id,
        },
    )

    return {"ok": True, "lat": payload.lat, "lng": payload.lng, "accuracy": accuracy, "heading": payload.heading, "ts": observed_at.isoformat()}



@router.post("/active/{ride_id}/payment-received", response_model=PaymentReceiveRead)
def receive_payment(
    ride_id: str,
    api_key: RiderAuthType = Depends(_validate_rider_api_key),
    db: Session = Depends(get_db),
) -> PaymentReceiveRead:
    if not api_key.driver_id:
        raise HTTPException(status_code=403, detail="API key is not linked to any driver")
    ride = db.get(Ride, ride_id)
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    if ride.driver_id != api_key.driver_id:
        raise HTTPException(status_code=403, detail="This ride is not assigned to your driver account")
    if ride.status != "completed":
        raise HTTPException(status_code=409, detail="Ride must be completed before payment")

    ride.payment_status = "paid"
    db.commit()
    db.refresh(ride)
    return PaymentReceiveRead(ride_id=ride.id, payment_status=ride.payment_status, status=ride.status)


@router.post("/active/{ride_id}/feedback")
async def submit_rider_feedback(
    ride_id: str,
    payload: dict,
    api_key: RiderAuthType = Depends(_validate_rider_api_key),
    db: Session = Depends(get_db),
) -> dict:
    if not api_key.driver_id:
        raise HTTPException(status_code=403, detail="API key is not linked to any driver")
    ride = db.get(Ride, ride_id)
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    if ride.driver_id != api_key.driver_id:
        raise HTTPException(status_code=403, detail="This ride is not assigned to your driver account")

    rating = payload.get("rating")
    comment = str(payload.get("comment") or "").strip()
    message_text = f"Rider feedback | rating: {rating or '-'} | comment: {comment or '-'}"
    row = RideMessage(
        ride_id=ride.id,
        sender_id=api_key.driver_id,
        sender_type="driver",
        message=message_text[:1800],
    )
    db.add(row)
    db.commit()

    await realtime_manager.broadcast(
        ride.id,
        {
            "event": "ride_feedback_created",
            "feedback": {"rating": rating, "comment": comment},
        },
    )
    return {"ride_id": ride.id, "saved": True}


@router.get("/active/{ride_id}/tracking", response_model=RideTrackingRead)
def get_active_tracking(
    ride_id: str,
    api_key: RiderAuthType = Depends(_validate_rider_api_key),
    db: Session = Depends(get_db),
) -> RideTrackingRead:
    if not api_key.driver_id:
        raise HTTPException(status_code=403, detail="API key is not linked to any driver")
    ride = db.get(Ride, ride_id)
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    if ride.status != "pending" and ride.driver_id != api_key.driver_id:
        raise HTTPException(status_code=403, detail="This ride is not assigned to your driver account")

    return _tracking_payload(ride)


@router.get("/active/{ride_id}/messages", response_model=list[RideMessageRead])
def get_driver_ride_messages(
    ride_id: str,
    api_key: RiderAuthType = Depends(_validate_rider_api_key),
    db: Session = Depends(get_db),
) -> list[RideMessageRead]:
    ride = db.get(Ride, ride_id)
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    if api_key.driver_id and ride.driver_id != api_key.driver_id:
        raise HTTPException(status_code=403, detail="This ride is not assigned to your driver account")
    
    return db.query(RideMessage).filter(RideMessage.ride_id == ride.id).order_by(RideMessage.created_at.asc()).all()


@router.post("/active/{ride_id}/messages", response_model=RideMessageRead, status_code=status.HTTP_201_CREATED)
async def send_driver_ride_message(
    ride_id: str,
    payload: RideMessageCreate,
    api_key: RiderAuthType = Depends(_validate_rider_api_key),
    db: Session = Depends(get_db),
) -> RideMessageRead:
    ride = db.get(Ride, ride_id)
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    if api_key.driver_id and ride.driver_id != api_key.driver_id:
        raise HTTPException(status_code=403, detail="This ride is not assigned to your driver account")

    msg = RideMessage(
        ride_id=ride.id,
        sender_id=api_key.driver_id or "system",
        sender_type="driver",
        message=payload.message.strip(),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    # Broadcast
    await realtime_manager.broadcast(
        ride.id,
        {
            "event": "chat_message_created",
            "message": RideMessageRead.model_validate(msg).model_dump(mode="json"),
        },
    )
    return msg
