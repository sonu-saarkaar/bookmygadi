import random
from math import atan2, cos, radians, sin, sqrt
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user
from app.api.realtime import realtime_manager
from app.db import get_db
from app.models import AdminSupportTicket, Ride, RideFeedback, RideMessage, RideNegotiation, RidePreference, User
from app.schemas import (
    LocationUpdate,
    PaymentReceiveRead,
    RideCreate,
    RideFeedbackCreate,
    RidePaymentMarkRequest,
    RideMessageCreate,
    RideMessageRead,
    RideNegotiationAction,
    RideNegotiationCreate,
    RideNegotiationRead,
    RideRead,
    RideSupportTicketCreate,
    RideTrackingRead,
    RideStatusUpdate,
    AdminSupportTicketRead,
)


router = APIRouter(prefix="/rides", tags=["rides"])


def _distance_km(pickup_lat: float | None, pickup_lng: float | None, destination_lat: float | None, destination_lng: float | None) -> float | None:
    if pickup_lat is None or pickup_lng is None or destination_lat is None or destination_lng is None:
        return None
    r = 6371.0
    dlat = radians(destination_lat - pickup_lat)
    dlon = radians(destination_lng - pickup_lng)
    a = sin(dlat / 2) ** 2 + cos(radians(pickup_lat)) * cos(radians(destination_lat)) * sin(dlon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return r * c


@router.post("", response_model=RideRead, status_code=status.HTTP_201_CREATED)
async def create_ride(
    payload: RideCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RideRead:
    reserve_distance = _distance_km(payload.pickup_lat, payload.pickup_lng, payload.destination_lat, payload.destination_lng)

    if payload.preference and (payload.preference.urgency_type or "").lower() == "reserve":
        reserve_hours = payload.preference.reserve_duration_hours
        # Only enforce duration/distance checks when the client explicitly sends them
        if reserve_hours is not None and reserve_hours < 5:
            raise HTTPException(status_code=400, detail="Reserve Car requires minimum 5 hours")
        if reserve_distance is not None and payload.preference.reserve_distance_km is not None and reserve_distance < 20:
            raise HTTPException(status_code=400, detail="Reserve Car is only for long distance trips (20km+)")

    ride = Ride(
        customer_id=current_user.id,
        pickup_location=payload.pickup_location,
        destination=payload.destination,
        vehicle_type=payload.vehicle_type,
        estimated_fare_min=payload.estimated_fare_min,
        estimated_fare_max=payload.estimated_fare_max,
        requested_fare=payload.requested_fare,
        pickup_lat=payload.pickup_lat,
        pickup_lng=payload.pickup_lng,
        destination_lat=payload.destination_lat,
        destination_lng=payload.destination_lng,
        start_otp=f"{random.randint(1000, 9999)}",
        payment_status="unpaid",
    )
    db.add(ride)
    db.flush()

    if payload.preference:
        pref = RidePreference(
            ride_id=ride.id,
            trip_type=payload.preference.trip_type,
            pickup_datetime=payload.preference.pickup_datetime,
            return_datetime=payload.preference.return_datetime,
            preferred_color=payload.preference.preferred_color,
            vehicle_condition=payload.preference.vehicle_condition,
            ac_required=payload.preference.ac_required,
            seater_required=payload.preference.seater_required,
            vehicle_model=payload.preference.vehicle_model,
            urgency_type=payload.preference.urgency_type,
            pickup_area=payload.preference.pickup_area,
            reserve_duration_hours=payload.preference.reserve_duration_hours,
            reserve_radius_km=payload.preference.reserve_radius_km,
            reserve_quote_low=payload.preference.reserve_quote_low,
            reserve_quote_high=payload.preference.reserve_quote_high,
            reserve_price_source=payload.preference.reserve_price_source,
            reserve_distance_km=payload.preference.reserve_distance_km if payload.preference.reserve_distance_km is not None else reserve_distance,
            vehicle_count=payload.preference.vehicle_count,
            advance_payment_status=payload.preference.advance_payment_status,
            advance_amount=payload.preference.advance_amount,
            market_rate=payload.preference.market_rate,
            booking_mode=payload.preference.booking_mode,
            supervisor_name=payload.preference.supervisor_name,
            supervisor_phone=payload.preference.supervisor_phone,
        )
        db.add(pref)

    db.commit()
    db.refresh(ride)

    await realtime_manager.broadcast(ride.id, {"event": "ride_created", "ride": RideRead.model_validate(ride).model_dump(mode="json")})
    return ride


@router.get("", response_model=list[RideRead])
def list_rides(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[RideRead]:
    query = db.query(Ride).options(joinedload(Ride.preference), joinedload(Ride.driver)).order_by(Ride.created_at.desc())
    if current_user.role == "driver":
        rides = query.filter((Ride.driver_id == current_user.id) | (Ride.status == "pending")).all()
    elif current_user.role == "admin":
        rides = query.all()
    else:
        rides = query.filter(Ride.customer_id == current_user.id).all()
    return rides


@router.get("/{ride_id}", response_model=RideRead)
def get_ride(ride_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> RideRead:
    ride = db.query(Ride).options(joinedload(Ride.preference), joinedload(Ride.driver)).filter(Ride.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")

    if current_user.role != "admin" and current_user.id not in {ride.customer_id, ride.driver_id}:
        raise HTTPException(status_code=403, detail="Access denied")

    return ride


@router.patch("/{ride_id}/status", response_model=RideRead)
async def update_ride_status(
    ride_id: str,
    payload: RideStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RideRead:
    ride = db.get(Ride, ride_id)
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")

    if current_user.role not in {"driver", "admin"} and payload.status != "cancelled":
        raise HTTPException(status_code=403, detail="Only driver or admin can update this status")

    if payload.driver_id:
        ride.driver_id = payload.driver_id
    elif current_user.role == "driver" and not ride.driver_id:
        ride.driver_id = current_user.id

    ride.status = payload.status
    if payload.status == "accepted":
        ride.accepted_at = datetime.utcnow()
    elif payload.status == "arriving":
        ride.arrived_at = datetime.utcnow()
    elif payload.status == "in_progress":
        ride.started_at = datetime.utcnow()
    elif payload.status == "completed":
        ride.completed_at = datetime.utcnow()

    if payload.agreed_fare is not None:
        ride.agreed_fare = payload.agreed_fare

    db.commit()
    db.refresh(ride)

    await realtime_manager.broadcast(ride.id, {"event": "ride_status_updated", "ride": RideRead.model_validate(ride).model_dump(mode="json")})
    return ride


@router.post("/{ride_id}/support-ticket", response_model=AdminSupportTicketRead, status_code=status.HTTP_201_CREATED)
def create_ride_support_ticket(
    ride_id: str,
    payload: RideSupportTicketCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AdminSupportTicketRead:
    ride = db.get(Ride, ride_id)
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")

    if current_user.role != "admin" and current_user.id not in {ride.customer_id, ride.driver_id}:
        raise HTTPException(status_code=403, detail="Access denied")

    issue_label_map = {
        "complaint": "Complaint Regarding Ride",
        "vehicle_issue": "Vehicle Issue",
        "police": "Police Assistance",
        "emergency": "Emergency",
    }
    title = payload.title or f"{issue_label_map.get(payload.issue_type, 'Support')} · Ride {ride.id[-6:].upper()}"
    description_parts = [
        f"Ride ID: {ride.id}",
        f"Panel: {payload.source_panel}",
        f"Issue Type: {payload.issue_type}",
        f"User: {current_user.name} ({current_user.role})",
        f"Pickup: {ride.pickup_location}",
        f"Drop: {ride.destination}",
    ]
    if payload.description:
        description_parts.append(payload.description)

    ticket = AdminSupportTicket(
        title=title,
        description="\n".join(description_parts),
        category=payload.issue_type,
        severity=payload.severity,
        status="open",
        created_by=current_user.name,
        ride_id=ride.id,
        reporter_phone=current_user.phone if hasattr(current_user, "phone") else None,
        reporter_role=current_user.role,
        pickup_location=ride.pickup_location,
        drop_location=ride.destination,
        pickup_lat=getattr(ride, "pickup_lat", None),
        pickup_lng=getattr(ride, "pickup_lng", None),
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


@router.get("/{ride_id}/messages", response_model=list[RideMessageRead])
def list_messages(ride_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[RideMessageRead]:
    ride = db.get(Ride, ride_id)
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")

    if current_user.role != "admin" and current_user.id not in {ride.customer_id, ride.driver_id}:
        raise HTTPException(status_code=403, detail="Access denied")

    return (
        db.query(RideMessage)
        .filter(RideMessage.ride_id == ride_id)
        .order_by(RideMessage.created_at.asc())
        .all()
    )


@router.post("/{ride_id}/messages", response_model=RideMessageRead, status_code=status.HTTP_201_CREATED)
async def post_message(
    ride_id: str,
    payload: RideMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RideMessageRead:
    ride = db.get(Ride, ride_id)
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")

    if current_user.role != "admin" and current_user.id not in {ride.customer_id, ride.driver_id}:
        raise HTTPException(status_code=403, detail="Access denied")

    msg = RideMessage(
        ride_id=ride_id,
        sender_id=current_user.id,
        sender_type="customer" if current_user.role == "customer" else "driver",
        message=payload.message.strip(),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    await realtime_manager.broadcast(
        ride_id,
        {
            "event": "chat_message_created",
            "message": RideMessageRead.model_validate(msg).model_dump(mode="json"),
        },
    )
    return msg


@router.get("/{ride_id}/negotiations", response_model=list[RideNegotiationRead])
def list_negotiations(
    ride_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[RideNegotiationRead]:
    ride = db.get(Ride, ride_id)
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    if current_user.role != "admin" and current_user.id not in {ride.customer_id, ride.driver_id}:
        raise HTTPException(status_code=403, detail="Access denied")
    return (
        db.query(RideNegotiation)
        .filter(RideNegotiation.ride_id == ride_id)
        .order_by(RideNegotiation.created_at.desc())
        .all()
    )


@router.post("/{ride_id}/negotiations", response_model=RideNegotiationRead, status_code=status.HTTP_201_CREATED)
async def create_negotiation(
    ride_id: str,
    payload: RideNegotiationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RideNegotiationRead:
    ride = db.get(Ride, ride_id)
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    if current_user.role != "admin" and current_user.id not in {ride.customer_id, ride.driver_id}:
        raise HTTPException(status_code=403, detail="Access denied")

    # close previous pending negotiations
    db.query(RideNegotiation).filter(
        RideNegotiation.ride_id == ride_id,
        RideNegotiation.status == "pending",
    ).update({"status": "superseded"}, synchronize_session=False)

    offered_by = "customer"
    if current_user.role == "driver":
        offered_by = "driver"
    elif current_user.role == "admin":
        offered_by = "system"

    row = RideNegotiation(
        ride_id=ride_id,
        offered_by=offered_by,
        driver_id=current_user.id if current_user.role == "driver" else None,
        amount=payload.amount,
        status="pending",
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    await realtime_manager.broadcast(
        ride_id,
        {
            "event": "ride_negotiation_created",
            "negotiation": RideNegotiationRead.model_validate(row).model_dump(mode="json"),
        },
    )
    return row


@router.post("/{ride_id}/negotiations/{negotiation_id}/action", response_model=RideNegotiationRead)
async def act_negotiation(
    ride_id: str,
    negotiation_id: str,
    payload: RideNegotiationAction,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RideNegotiationRead:
    ride = db.get(Ride, ride_id)
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    if current_user.role != "admin" and current_user.id not in {ride.customer_id, ride.driver_id}:
        raise HTTPException(status_code=403, detail="Access denied")

    negotiation = db.query(RideNegotiation).filter(
        RideNegotiation.id == negotiation_id,
        RideNegotiation.ride_id == ride_id,
    ).first()
    if not negotiation:
        raise HTTPException(status_code=404, detail="Negotiation not found")
    if negotiation.status != "pending":
        raise HTTPException(status_code=409, detail=f"Negotiation already {negotiation.status}")

    if payload.action == "accept":
        negotiation.status = "accepted"
        ride.agreed_fare = negotiation.amount
        ride.status = "accepted"
        ride.accepted_at = datetime.utcnow()
        if negotiation.driver_id and not ride.driver_id:
            ride.driver_id = negotiation.driver_id
    else:
        negotiation.status = "rejected"

    db.commit()
    db.refresh(negotiation)
    db.refresh(ride)

    await realtime_manager.broadcast(
        ride_id,
        {
            "event": "ride_negotiation_updated",
            "negotiation": RideNegotiationRead.model_validate(negotiation).model_dump(mode="json"),
            "ride": RideRead.model_validate(ride).model_dump(mode="json"),
        },
    )
    return negotiation


@router.post("/{ride_id}/customer-location", response_model=RideTrackingRead)
def update_customer_location(
    ride_id: str,
    payload: LocationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RideTrackingRead:
    ride = db.get(Ride, ride_id)
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    if current_user.id != ride.customer_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only customer can update this location")

    ride.customer_live_lat = payload.lat
    ride.customer_live_lng = payload.lng
    db.commit()
    db.refresh(ride)
    return RideTrackingRead(
        ride_id=ride.id,
        status=ride.status,
        pickup_location=ride.pickup_location,
        destination=ride.destination,
        driver_live_lat=ride.driver_live_lat,
        driver_live_lng=ride.driver_live_lng,
        customer_live_lat=ride.customer_live_lat,
        customer_live_lng=ride.customer_live_lng,
        pickup_lat=ride.pickup_lat,
        pickup_lng=ride.pickup_lng,
        destination_lat=ride.destination_lat,
        destination_lng=ride.destination_lng,
    )


@router.post("/{ride_id}/payment", response_model=PaymentReceiveRead)
async def mark_ride_payment(
    ride_id: str,
    payload: RidePaymentMarkRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PaymentReceiveRead:
    ride = db.get(Ride, ride_id)
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    if current_user.role != "admin" and current_user.id != ride.customer_id:
        raise HTTPException(status_code=403, detail="Only customer can mark this payment")
    if ride.status != "completed":
        raise HTTPException(status_code=409, detail="Ride must be completed before payment")
    if ride.payment_status != "paid":
        ride.payment_status = "paid"
        db.commit()
        db.refresh(ride)
        await realtime_manager.broadcast(
            ride.id,
            {
                "event": "ride_payment_updated",
                "ride": RideRead.model_validate(ride).model_dump(mode="json"),
                "payment": {
                    "status": ride.payment_status,
                    "method": payload.payment_method,
                    "transaction_ref": payload.transaction_ref,
                },
            },
        )
    return PaymentReceiveRead(ride_id=ride.id, payment_status=ride.payment_status, status=ride.status)


@router.get("/{ride_id}/tracking", response_model=RideTrackingRead)
def get_tracking(
    ride_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RideTrackingRead:
    ride = db.get(Ride, ride_id)
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    if current_user.role != "admin" and current_user.id not in {ride.customer_id, ride.driver_id}:
        raise HTTPException(status_code=403, detail="Access denied")
    return RideTrackingRead(
        ride_id=ride.id,
        status=ride.status,
        pickup_location=ride.pickup_location,
        destination=ride.destination,
        driver_live_lat=ride.driver_live_lat,
        driver_live_lng=ride.driver_live_lng,
        customer_live_lat=ride.customer_live_lat,
        customer_live_lng=ride.customer_live_lng,
        pickup_lat=ride.pickup_lat,
        pickup_lng=ride.pickup_lng,
        destination_lat=ride.destination_lat,
        destination_lng=ride.destination_lng,
    )


@router.post("/{ride_id}/feedback", response_model=RideRead)
def submit_feedback(
    ride_id: str,
    payload: RideFeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RideRead:
    ride = db.get(Ride, ride_id)
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    if current_user.id != ride.customer_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only customer can submit feedback")
    if ride.status != "completed" or ride.payment_status != "paid":
        raise HTTPException(status_code=409, detail="Feedback allowed after payment completion")

    existing = db.query(RideFeedback).filter(RideFeedback.ride_id == ride_id).first()
    if existing:
        existing.rating = payload.rating
        existing.comment = payload.comment
    else:
        db.add(
            RideFeedback(
                ride_id=ride_id,
                customer_id=current_user.id,
                rating=payload.rating,
                comment=payload.comment,
            )
        )
    db.commit()
    db.refresh(ride)
    return ride
