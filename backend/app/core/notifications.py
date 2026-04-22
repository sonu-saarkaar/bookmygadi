"""
BookMyGaadi notification engine.

Uses FCM data messages so Android apps can decide how to render alerts even
when the app process is cold-started in the background.
"""

import asyncio

import httpx

from app.core.config import settings

FCM_URL = "https://fcm.googleapis.com/fcm/send"


async def _send_fcm(token: str, title: str, body: str, data: dict | None = None) -> bool:
    if not token or not settings.fcm_server_key:
        return False

    merged_data = data or {}
    merged_data.update(
        {
            "title": title,
            "body": body,
            "type": merged_data.get("event", "UNKNOWN"),
        }
    )
    merged_data = {str(k): str(v) for k, v in merged_data.items()}

    payload = {
        "to": token,
        "data": merged_data,
        "priority": "high",
        "content_available": True,
    }
    headers = {
        "Authorization": f"key={settings.fcm_server_key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(FCM_URL, json=payload, headers=headers)
            return resp.status_code == 200
    except Exception as exc:
        print(f"[FCM] Error sending push: {exc}")
        return False


async def _send_bulk_fcm(tokens: list[str], title: str, body: str, data: dict | None = None) -> int:
    unique_tokens = [token for token in {t.strip() for t in tokens if t and t.strip()}]
    if not unique_tokens:
        return 0
    results = await asyncio.gather(
        *[_send_fcm(token, title, body, data) for token in unique_tokens],
        return_exceptions=True,
    )
    return sum(1 for result in results if result is True)


async def notify_ride_accepted(customer_fcm_token: str | None, driver_name: str, eta_mins: int = 5) -> None:
    if not customer_fcm_token:
        return
    await _send_fcm(
        token=customer_fcm_token,
        title="Driver Assigned!",
        body=f"{driver_name} is coming to pick you up. ETA ~{eta_mins} min.",
        data={"event": "RIDE_ACCEPTED", "screen": "tracking", "channel": "RIDE_STATUS"},
    )


async def notify_driver_arriving(customer_fcm_token: str | None, driver_name: str) -> None:
    if not customer_fcm_token:
        return
    await _send_fcm(
        token=customer_fcm_token,
        title="Driver Arriving",
        body=f"{driver_name} is almost at your pickup point!",
        data={"event": "DRIVER_ARRIVING", "screen": "tracking", "channel": "RIDE_STATUS"},
    )


async def notify_ride_started(customer_fcm_token: str | None, destination: str) -> None:
    if not customer_fcm_token:
        return
    await _send_fcm(
        token=customer_fcm_token,
        title="Ride Started",
        body=f"You're on your way to {destination}. Enjoy the ride!",
        data={"event": "RIDE_STARTED", "screen": "tracking", "channel": "RIDE_STATUS"},
    )


async def notify_ride_completed(customer_fcm_token: str | None, fare: float | None) -> None:
    if not customer_fcm_token:
        return
    fare_text = f"Rs {int(fare)}" if fare else "the agreed fare"
    await _send_fcm(
        token=customer_fcm_token,
        title="Ride Completed",
        body=f"Thanks for riding with BookMyGaadi! Please pay {fare_text} to your driver.",
        data={"event": "RIDE_COMPLETED", "screen": "feedback", "channel": "RIDE_STATUS"},
    )


async def notify_new_ride_request(
    driver_fcm_token: str | None,
    pickup: str,
    destination: str,
    fare: float | None,
    ride_id: str | None = None,
) -> None:
    if not driver_fcm_token:
        return
    fare_text = f"Rs {int(fare)}" if fare else "Negotiable"
    await _send_fcm(
        token=driver_fcm_token,
        title="New Ride Request",
        body=f"{pickup} -> {destination} • {fare_text}",
        data={
            "event": "NEW_RIDE",
            "ride_id": ride_id or "",
            "pickup": pickup,
            "drop": destination,
            "price": fare_text,
            "screen": "requests",
            "channel": "RIDE_ALERT",
        },
    )


async def notify_new_ride_request_batch(
    driver_fcm_tokens: list[str],
    pickup: str,
    destination: str,
    fare: float | None,
    ride_id: str,
) -> int:
    fare_text = f"Rs {int(fare)}" if fare else "Negotiable"
    return await _send_bulk_fcm(
        tokens=driver_fcm_tokens,
        title="New Ride Request",
        body=f"{pickup} -> {destination} • {fare_text}",
        data={
            "event": "NEW_RIDE",
            "ride_id": ride_id,
            "pickup": pickup,
            "drop": destination,
            "price": fare_text,
            "screen": "requests",
            "channel": "RIDE_ALERT",
        },
    )


async def notify_ride_cancelled(
    fcm_token: str | None,
    *,
    target_role: str = "driver",
    ride_id: str | None = None,
) -> None:
    if not fcm_token:
        return
    await _send_fcm(
        token=fcm_token,
        title="Ride Cancelled",
        body="The ride was cancelled.",
        data={
            "event": "RIDE_CANCELLED",
            "screen": "home" if target_role == "driver" else "tracking",
            "ride_id": ride_id or "",
            "channel": "RIDE_STATUS",
        },
    )
