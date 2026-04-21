"""
BookMyGaadi — Notification Engine
Handles FCM push notifications for all ride lifecycle events.

Setup (.env):
  FCM_SERVER_KEY=your_firebase_server_key_here

Install:
  pip install httpx
"""

import httpx
import asyncio
from app.core.config import settings


FCM_URL = "https://fcm.googleapis.com/fcm/send"


async def _send_fcm(token: str, title: str, body: str, data: dict | None = None) -> bool:
    """
    Send a single FCM push notification to a device token.
    Uses strictly 'data' payloads so Android background services handle everything locally.
    Returns True on success, False on failure.
    """
    if not token or not settings.fcm_server_key:
        return False

    merged_data = data or {}
    merged_data.update({
        "title": title,
        "body": body,
        "type": merged_data.get("event", "UNKNOWN")
    })
    
    # Ensure all values in data are strings
    merged_data = {str(k): str(v) for k, v in merged_data.items()}

    payload = {
        "to": token,
        "data": merged_data,
        "priority": "high",
    }

    headers = {
        "Authorization": f"key={settings.fcm_server_key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(FCM_URL, json=payload, headers=headers)
            return resp.status_code == 200
    except Exception as e:
        print(f"[FCM] Error sending push: {e}")
        return False


# ---------------------------------------------------------------------------
# Convenience helpers — one per ride lifecycle event
# ---------------------------------------------------------------------------

async def notify_ride_accepted(customer_fcm_token: str | None, driver_name: str, eta_mins: int = 5) -> None:
    if not customer_fcm_token:
        return
    await _send_fcm(
        token=customer_fcm_token,
        title="Driver Assigned! 🚗",
        body=f"{driver_name} is coming to pick you up. ETA ~{eta_mins} min.",
        data={"event": "RIDE_ACCEPTED", "screen": "tracking"},
    )


async def notify_driver_arriving(customer_fcm_token: str | None, driver_name: str) -> None:
    if not customer_fcm_token:
        return
    await _send_fcm(
        token=customer_fcm_token,
        title="Driver Arriving 📍",
        body=f"{driver_name} is almost at your pickup point!",
        data={"event": "DRIVER_ARRIVING", "screen": "tracking"},
    )


async def notify_ride_started(customer_fcm_token: str | None, destination: str) -> None:
    if not customer_fcm_token:
        return
    await _send_fcm(
        token=customer_fcm_token,
        title="Ride Started 🏎️",
        body=f"You're on your way to {destination}. Enjoy the ride!",
        data={"event": "RIDE_STARTED", "screen": "tracking"},
    )


async def notify_ride_completed(customer_fcm_token: str | None, fare: float | None) -> None:
    if not customer_fcm_token:
        return
    fare_text = f"₹{int(fare)}" if fare else "the agreed fare"
    await _send_fcm(
        token=customer_fcm_token,
        title="Ride Completed ✅",
        body=f"Thanks for riding with BookMyGaadi! Please pay {fare_text} to your driver.",
        data={"event": "RIDE_COMPLETED", "screen": "feedback"},
    )


async def notify_new_ride_request(driver_fcm_token: str | None, pickup: str, destination: str, fare: float | None) -> None:
    if not driver_fcm_token:
        return
    fare_text = f"₹{int(fare)}" if fare else "negotiable"
    await _send_fcm(
        token=driver_fcm_token,
        title="New Ride Request 🔔",
        body=f"{pickup} → {destination} • {fare_text}",
        data={"event": "NEW_RIDE_REQUEST", "screen": "requests"},
    )


async def notify_ride_cancelled(driver_fcm_token: str | None) -> None:
    if not driver_fcm_token:
        return
    await _send_fcm(
        token=driver_fcm_token,
        title="Ride Cancelled ❌",
        body="The customer cancelled the ride request.",
        data={"event": "RIDE_CANCELLED", "screen": "home"},
    )
