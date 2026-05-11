"""Service-specific instant (non-reserve) fare estimation.

Admin-defined route rules + vehicle modifiers still apply; this module chooses
billable distance (local cap) and per-service curve (bike/auto/car/pickup/lorry).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models import RoutePriceRule, VehiclePriceModifier


@dataclass(frozen=True)
class InstantQuoteResult:
    suggested_fare: int
    min_fare: int
    max_fare: int
    algorithm: str
    billable_distance_km: float
    raw_distance_km: float
    demand_multiplier: float
    vehicle_multiplier: float


def normalize_service_profile(vehicle_type: str, service_profile: str | None) -> str:
    p = (service_profile or "").strip().lower()
    if p in {"general", "pickup", "lorry", "bike", "auto", "car", "events", "farming"}:
        return p
    v = (vehicle_type or "car").lower()
    if v in {"bike", "motorcycle", "scooter"}:
        return "bike"
    if v in {"auto", "rickshaw", "e_rickshaw", "erickshaw"}:
        return "auto"
    if v in {"bolero", "pickup", "mini_truck", "mini pickup", "goods"}:
        return "pickup"
    if v in {"lorry", "truck", "tractor", "tempo", "canter"}:
        return "lorry"
    return "car"


def _billable_km(raw_dist: float, base_km: float, local_cap_km: float, use_full_distance: bool) -> float:
    if use_full_distance:
        return max(raw_dist, 0.01)
    cap = max(float(local_cap_km), float(base_km), 5.0)
    return min(max(raw_dist, 0.01), cap)


def compute_instant_quote(
    *,
    vehicle_type: str,
    service_profile: str | None,
    raw_distance_km: float,
    route_rule: RoutePriceRule | None,
    vehicle_mod: VehiclePriceModifier | None,
    demand: float,
    local_cap_km: float,
    use_full_distance: bool = False,
) -> InstantQuoteResult:
    profile = normalize_service_profile(vehicle_type, service_profile)
    vt = (vehicle_type or "car").lower()

    base_km = float(route_rule.base_km) if route_rule else 6.0
    base_fare = int(route_rule.base_fare) if route_rule else 140
    per_km_rate = float(route_rule.per_km_rate) if route_rule else 18.0
    min_fare_rule = int(route_rule.min_fare) if route_rule else 120
    max_multiplier = float(route_rule.max_multiplier) if route_rule else 1.25

    vehicle_multiplier = vehicle_mod.multiplier if vehicle_mod else 1.0
    flat_adjustment = int(vehicle_mod.flat_adjustment) if vehicle_mod else 0
    floor = int(vehicle_mod.min_fare_floor) if vehicle_mod else min_fare_rule

    dist = _billable_km(raw_distance_km, base_km, local_cap_km, use_full_distance)

    if profile == "bike":
        bike_base, bike_base_km, bike_per_km = 20, 1.5, 10.0
        raw = bike_base + max(0.0, dist - bike_base_km) * bike_per_km
        suggested = int(round(raw * demand))
        floor_local = 20
        min_quote = max(int(round(suggested * 0.8)), floor_local)
        max_quote = int(round(suggested * 1.3))
        algo = "instant_bike_local_cap" if not use_full_distance else "instant_bike_full_dist"
        return InstantQuoteResult(
            suggested, min_quote, max_quote, algo, dist, raw_distance_km, demand, 1.0
        )

    if profile == "auto":
        auto_base, auto_base_km, auto_per_km = 35, 2.0, 15.0
        raw = auto_base + max(0.0, dist - auto_base_km) * auto_per_km
        suggested = int(round(raw * demand))
        floor_local = 35
        min_quote = max(int(round(suggested * 0.85)), floor_local)
        max_quote = int(round(suggested * 1.25))
        algo = "instant_auto_local_cap" if not use_full_distance else "instant_auto_full_dist"
        return InstantQuoteResult(
            suggested, min_quote, max_quote, algo, dist, raw_distance_km, demand, 1.0
        )

    if profile == "pickup":
        # Goods / mini pickup: higher floor, steeper per km after admin base segment.
        eff_base_km = max(base_km, 3.0)
        eff_per_km = per_km_rate * 1.35
        eff_base_fare = int(base_fare * 1.2)
        raw = eff_base_fare + max(0.0, dist - eff_base_km) * eff_per_km
        suggested = int(round(raw * demand * vehicle_multiplier + flat_adjustment))
        suggested = max(suggested, floor, min_fare_rule, 180)
        min_quote = max(int(round(suggested * 0.9)), floor, min_fare_rule)
        max_quote = max(int(round(suggested * max_multiplier)), suggested)
        algo = "instant_pickup_admin_route"
        return InstantQuoteResult(
            suggested, min_quote, max_quote, algo, dist, raw_distance_km, demand, vehicle_multiplier
        )

    if profile == "lorry":
        eff_base_km = max(base_km, 5.0)
        eff_per_km = per_km_rate * 1.75
        eff_base_fare = int(base_fare * 1.55)
        raw = eff_base_fare + max(0.0, dist - eff_base_km) * eff_per_km
        suggested = int(round(raw * demand * vehicle_multiplier + flat_adjustment))
        suggested = max(suggested, floor, min_fare_rule, 450)
        min_quote = max(int(round(suggested * 0.92)), floor, min_fare_rule)
        max_quote = max(int(round(suggested * max(1.2, max_multiplier * 0.95))), suggested)
        algo = "instant_lorry_admin_route"
        return InstantQuoteResult(
            suggested, min_quote, max_quote, algo, dist, raw_distance_km, demand, vehicle_multiplier
        )

    # car / general / default
    raw = (base_fare + max(0.0, dist - base_km) * per_km_rate) * demand
    suggested = int(round(raw * vehicle_multiplier + flat_adjustment))
    suggested = max(suggested, floor, min_fare_rule)
    min_quote = max(int(round(suggested * 0.9)), floor, min_fare_rule)
    max_quote = max(int(round(suggested * max_multiplier)), suggested)
    algo = f"instant_car_{vt}" if vt != "car" else "instant_car_default"
    return InstantQuoteResult(
        suggested, min_quote, max_quote, algo, dist, raw_distance_km, demand, vehicle_multiplier
    )


def reserve_row_price_multiplier(service_hint: str | None, reserve_category: str | None) -> float:
    """Bump reserve per-driver quotes for events / heavy logistics."""
    cat = (reserve_category or "").strip().lower()
    hint = (service_hint or "").lower()
    if cat == "events" or any(k in hint for k in ("wedding", "event", "barat", "sadi")):
        return 1.22
    if cat == "farming" or any(k in hint for k in ("farm", "logistic", "cargo", "tractor", "bolero", "lorry")):
        return 1.18
    return 1.0
