"""
BookMyGaadi — Payment API
Razorpay order creation + verification.

Setup (.env):
  RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
  RAZORPAY_KEY_SECRET=your_razorpay_secret

Install:
  pip install razorpay
"""

import hashlib
import hmac
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.db import get_db
from app.models import Ride, User

router = APIRouter(prefix="/payment", tags=["payment"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class CreateOrderRequest(BaseModel):
    ride_id: str


class CreateOrderResponse(BaseModel):
    order_id: str
    amount: int          # paise (1 INR = 100 paise)
    currency: str
    ride_id: str
    razorpay_key: str    # public key sent to client


class VerifyPaymentRequest(BaseModel):
    ride_id: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class VerifyPaymentResponse(BaseModel):
    success: bool
    message: str
    ride_id: str
    payment_status: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_razorpay_client():
    """Lazily import razorpay so server starts even without it installed."""
    try:
        import razorpay  # type: ignore
        return razorpay.Client(
            auth=(settings.razorpay_key_id, settings.razorpay_key_secret)
        )
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="Razorpay SDK not installed. Run: pip install razorpay"
        )


def _verify_razorpay_signature(
    order_id: str,
    payment_id: str,
    signature: str,
    secret: str,
) -> bool:
    """HMAC-SHA256 verification as specified by Razorpay docs."""
    body = f"{order_id}|{payment_id}"
    expected = hmac.new(
        secret.encode("utf-8"),
        body.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


# ---------------------------------------------------------------------------
# POST /api/v1/payment/create-order
# ---------------------------------------------------------------------------

@router.post("/create-order", response_model=CreateOrderResponse)
def create_payment_order(
    body: CreateOrderRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CreateOrderResponse:
    """
    Creates a Razorpay order for the given ride.
    Must be called by the authenticated customer.
    """
    ride = db.get(Ride, body.ride_id)
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    if ride.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your ride")
    if ride.status != "completed":
        raise HTTPException(status_code=409, detail="Ride must be completed before payment")
    if ride.payment_status == "paid":
        raise HTTPException(status_code=409, detail="Ride already paid")

    fare = ride.agreed_fare or ride.estimated_fare_max or 0
    amount_paise = int(fare * 100)  # Razorpay works in the smallest currency unit

    client = _get_razorpay_client()

    order_data = client.order.create({
        "amount": amount_paise,
        "currency": "INR",
        "receipt": f"bmg_{ride.id[:8]}",
        "notes": {
            "ride_id": ride.id,
            "customer_id": current_user.id,
        },
    })

    return CreateOrderResponse(
        order_id=order_data["id"],
        amount=amount_paise,
        currency="INR",
        ride_id=ride.id,
        razorpay_key=settings.razorpay_key_id,
    )


# ---------------------------------------------------------------------------
# POST /api/v1/payment/verify
# ---------------------------------------------------------------------------

@router.post("/verify", response_model=VerifyPaymentResponse)
def verify_payment(
    body: VerifyPaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> VerifyPaymentResponse:
    """
    Verifies Razorpay payment signature and marks ride as paid.
    """
    ride = db.get(Ride, body.ride_id)
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    if ride.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your ride")

    # Signature verification — critical security step
    is_valid = _verify_razorpay_signature(
        order_id=body.razorpay_order_id,
        payment_id=body.razorpay_payment_id,
        signature=body.razorpay_signature,
        secret=settings.razorpay_key_secret,
    )

    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    ride.payment_status = "paid"
    db.commit()

    return VerifyPaymentResponse(
        success=True,
        message="Payment verified successfully",
        ride_id=ride.id,
        payment_status="paid",
    )


# ---------------------------------------------------------------------------
# GET /api/v1/payment/status/{ride_id}
# ---------------------------------------------------------------------------

@router.get("/status/{ride_id}")
def get_payment_status(
    ride_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    ride = db.get(Ride, ride_id)
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    if ride.customer_id != current_user.id and current_user.role not in ("admin", "driver"):
        raise HTTPException(status_code=403, detail="Access denied")

    return {
        "ride_id": ride.id,
        "payment_status": ride.payment_status,
        "agreed_fare": ride.agreed_fare,
        "ride_status": ride.status,
    }
