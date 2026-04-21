from math import atan2, cos, radians, sin, sqrt
from statistics import mean

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_admin_user, get_current_user
from app.db import get_db
from app.models import ReserveDefaultRate, ReserveRoutePrice, Ride, RiderApiKey, RoutePriceRule, User, VehiclePriceModifier
from app.schemas import (
    NearbyRiderRead,
    PricingQuoteRead,
    ReserveDefaultRateCreate,
    ReserveDefaultRateRead,
    ReserveDefaultRateUpdate,
    ReserveQuoteRead,
    ReserveQuoteRow,
    ReserveRoutePriceCreate,
    ReserveRoutePriceRead,
    ReserveRoutePriceUpdate,
    RoutePriceRuleBulkUpsert,
    RoutePriceRuleCreate,
    RoutePriceRuleRead,
    RoutePriceRuleUpdate,
    VehiclePriceModifierCreate,
    VehiclePriceModifierRead,
    VehiclePriceModifierUpdate,
)


router = APIRouter(prefix="/pricing", tags=["pricing"])


def _distance_km(pickup_lat: float | None, pickup_lng: float | None, destination_lat: float | None, destination_lng: float | None) -> float | None:
    if pickup_lat is None or pickup_lng is None or destination_lat is None or destination_lng is None:
        return None
    r = 6371.0
    dlat = radians(destination_lat - pickup_lat)
    dlon = radians(destination_lng - pickup_lng)
    a = sin(dlat / 2) ** 2 + cos(radians(pickup_lat)) * cos(radians(destination_lat)) * sin(dlon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return r * c


def _norm_area(text: str) -> str:
    return (text or "").strip().lower()


def _route_match(route_from: str, route_to: str, pickup_area: str, destination_area: str) -> bool:
    rf = _norm_area(route_from)
    rt = _norm_area(route_to)
    pa = _norm_area(pickup_area)
    da = _norm_area(destination_area)
    return (rf in pa and rt in da) or (rf in da and rt in pa)


def _price_for_duration(row: ReserveRoutePrice, duration_hours: int) -> int:
    if duration_hours <= 12:
        return row.price_12h
    if duration_hours >= 24:
        return row.price_24h
    # linear interpolation between 12h and 24h
    ratio = (duration_hours - 12) / 12
    return int(round(row.price_12h + (row.price_24h - row.price_12h) * ratio))


def _latest_driver_location(db: Session, driver_id: str) -> tuple[float | None, float | None]:
    ride = (
        db.query(Ride)
        .filter(Ride.driver_id == driver_id, Ride.driver_live_lat.is_not(None), Ride.driver_live_lng.is_not(None))
        .order_by(Ride.updated_at.desc())
        .first()
    )
    if not ride:
        return None, None
    return ride.driver_live_lat, ride.driver_live_lng


def _demand_multiplier() -> float:
    from datetime import datetime

    hour = datetime.now().hour
    if 8 <= hour <= 11 or 17 <= hour <= 21:
        return 1.15
    if 22 <= hour or hour <= 5:
        return 1.1
    return 1.0


def _find_route_rule(db: Session, pickup_area: str, destination_area: str) -> RoutePriceRule | None:
    pickup_area = pickup_area.strip().lower()
    destination_area = destination_area.strip().lower()
    rules = db.query(RoutePriceRule).filter(RoutePriceRule.is_active.is_(True)).all()
    for row in rules:
        if row.pickup_area.lower() in pickup_area and row.destination_area.lower() in destination_area:
            return row
        if row.destination_area.lower() in pickup_area and row.pickup_area.lower() in destination_area:
            return row
    return None


def _get_vehicle_modifier(db: Session, vehicle_type: str) -> VehiclePriceModifier | None:
    return (
        db.query(VehiclePriceModifier)
        .filter(
            VehiclePriceModifier.vehicle_type == vehicle_type.lower(),
            VehiclePriceModifier.is_active.is_(True),
        )
        .first()
    )


def _fallback_from_recent_trips(db: Session, pickup_area: str, destination_area: str, duration_hours: int) -> tuple[int, int] | None:
    rows = (
        db.query(Ride)
        .filter(Ride.status == "completed", Ride.agreed_fare.is_not(None))
        .order_by(Ride.updated_at.desc())
        .limit(100)
        .all()
    )
    matched = []
    for row in rows:
        pref_area = row.pickup_location
        if _route_match(pref_area, row.destination, pickup_area, destination_area):
            matched.append(int(row.agreed_fare or 0))
    if not matched:
        return None
    avg = int(round(mean(matched)))
    duration_mult = max(1.0, duration_hours / 6)
    base = int(round(avg * duration_mult))
    return max(1000, int(base * 0.9)), int(base * 1.2)


def _fallback_from_defaults(db: Session, pickup_area: str, destination_area: str, vehicle_type: str, duration_hours: int) -> tuple[int, int] | None:
    rows = db.query(ReserveDefaultRate).filter(ReserveDefaultRate.is_active.is_(True), ReserveDefaultRate.vehicle_type == vehicle_type.lower()).all()
    exact = [r for r in rows if _route_match(r.route_from, r.route_to, pickup_area, destination_area)]
    scoped = exact or rows
    if not scoped:
        return None
    # pick nearest duration
    best = sorted(scoped, key=lambda r: abs((r.duration_hours or 12) - duration_hours))[0]
    return best.default_min_price, best.default_max_price


@router.get("/quote", response_model=PricingQuoteRead)
def get_quote(
    pickup_area: str = Query(...),
    destination_area: str = Query(...),
    vehicle_type: str = Query(default="car"),
    pickup_lat: float | None = Query(default=None),
    pickup_lng: float | None = Query(default=None),
    destination_lat: float | None = Query(default=None),
    destination_lng: float | None = Query(default=None),
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PricingQuoteRead:
    route_rule = _find_route_rule(db, pickup_area, destination_area)
    vehicle_mod = _get_vehicle_modifier(db, vehicle_type)

    base_km = route_rule.base_km if route_rule else 6.0
    base_fare = route_rule.base_fare if route_rule else 140
    per_km_rate = route_rule.per_km_rate if route_rule else 18.0
    min_fare = route_rule.min_fare if route_rule else 120
    max_multiplier = route_rule.max_multiplier if route_rule else 1.25

    dist = _distance_km(pickup_lat, pickup_lng, destination_lat, destination_lng) or base_km
    demand = _demand_multiplier()
    vehicle_multiplier = vehicle_mod.multiplier if vehicle_mod else 1.0
    flat_adjustment = vehicle_mod.flat_adjustment if vehicle_mod else 0
    floor = vehicle_mod.min_fare_floor if vehicle_mod else min_fare

    if vehicle_type.lower() == "bike":
        # Realistic BIKE pricing model (like Rapido)
        # Base fare typically ₹20 for first 1.5 km
        # Per km rate typically ₹8 to ₹12 after base
        bike_base = 20
        bike_base_km = 1.5
        bike_per_km = 10
        raw = bike_base + max(0.0, dist - bike_base_km) * bike_per_km
        suggested = int(round(raw * demand))
        floor = 20
        min_quote = max(int(round(suggested * 0.8)), floor)  # Allows slight bargaining down
        max_quote = int(round(suggested * 1.3))              # Max cap
    elif vehicle_type.lower() == "auto":
        # Auto-rickshaw model
        auto_base = 35
        auto_base_km = 2.0
        auto_per_km = 15
        raw = auto_base + max(0.0, dist - auto_base_km) * auto_per_km
        suggested = int(round(raw * demand))
        floor = 35
        min_quote = max(int(round(suggested * 0.85)), floor)
        max_quote = int(round(suggested * 1.25))
    else:    
        raw = (base_fare + max(0.0, dist - base_km) * per_km_rate) * demand
        suggested = int(round(raw * vehicle_multiplier + flat_adjustment))
        suggested = max(suggested, floor, min_fare)
        min_quote = max(int(round(suggested * 0.9)), floor, min_fare)
        max_quote = max(int(round(suggested * max_multiplier)), suggested)

    return PricingQuoteRead(
        pickup_area=pickup_area,
        destination_area=destination_area,
        vehicle_type=vehicle_type.lower(),
        estimated_distance_km=round(dist, 2),
        suggested_fare=suggested,
        min_fare=min_quote,
        max_fare=max_quote,
        demand_multiplier=round(demand, 2),
        vehicle_multiplier=round(vehicle_multiplier, 2),
    )


@router.get("/nearby-riders", response_model=list[NearbyRiderRead])
def list_nearby_riders(
    pickup_lat: float = Query(...),
    pickup_lng: float = Query(...),
    radius_km: float = Query(default=10.0, ge=0.5, le=50.0),
    limit: int = Query(default=60, ge=1, le=300),
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[NearbyRiderRead]:
    linked_driver_ids = {
        row.driver_id
        for row in db.query(RiderApiKey.driver_id).filter(RiderApiKey.is_active.is_(True), RiderApiKey.driver_id.is_not(None)).all()
    }
    if not linked_driver_ids:
        return []

    ride_rows = (
        db.query(Ride)
        .filter(
            Ride.driver_id.is_not(None),
            Ride.driver_id.in_(linked_driver_ids),
            Ride.driver_live_lat.is_not(None),
            Ride.driver_live_lng.is_not(None),
            Ride.status.in_(["accepted", "arriving", "in_progress"]),
        )
        .order_by(Ride.updated_at.desc())
        .limit(2000)
        .all()
    )

    latest_by_driver: dict[str, Ride] = {}
    for row in ride_rows:
        if row.driver_id and row.driver_id not in latest_by_driver:
            latest_by_driver[row.driver_id] = row

    if not latest_by_driver:
        return []

    driver_ids = list(latest_by_driver.keys())
    drivers = db.query(User).filter(User.id.in_(driver_ids)).all()
    name_by_id = {d.id: d.name for d in drivers}

    out: list[NearbyRiderRead] = []
    for driver_id, ride in latest_by_driver.items():
        dist = _distance_km(pickup_lat, pickup_lng, ride.driver_live_lat, ride.driver_live_lng)
        if dist is None or dist > radius_km:
            continue
        out.append(
            NearbyRiderRead(
                driver_id=driver_id,
                driver_name=name_by_id.get(driver_id),
                lat=float(ride.driver_live_lat),
                lng=float(ride.driver_live_lng),
                distance_km=round(float(dist), 2),
            )
        )

    out.sort(key=lambda row: row.distance_km)
    return out[:limit]


@router.get("/routes", response_model=list[RoutePriceRuleRead])
def list_route_rules(
    _admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> list[RoutePriceRuleRead]:
    return db.query(RoutePriceRule).order_by(RoutePriceRule.created_at.desc()).all()


@router.post("/routes", response_model=RoutePriceRuleRead, status_code=status.HTTP_201_CREATED)
def create_route_rule(
    payload: RoutePriceRuleCreate,
    _admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> RoutePriceRuleRead:
    row = RoutePriceRule(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.put("/routes/{rule_id}", response_model=RoutePriceRuleRead)
def update_route_rule(
    rule_id: str,
    payload: RoutePriceRuleUpdate,
    _admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> RoutePriceRuleRead:
    row = db.get(RoutePriceRule, rule_id)
    if not row:
        raise HTTPException(status_code=404, detail="Route rule not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return row


@router.post("/routes/bulk-upsert", response_model=dict)
def bulk_upsert_route_rules(
    payload: RoutePriceRuleBulkUpsert,
    _admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> dict:
    upserted = 0
    for in_row in payload.rows:
        row = (
            db.query(RoutePriceRule)
            .filter(
                RoutePriceRule.pickup_area == in_row.pickup_area,
                RoutePriceRule.destination_area == in_row.destination_area,
            )
            .first()
        )
        if row:
            for key, value in in_row.model_dump().items():
                setattr(row, key, value)
        else:
            db.add(RoutePriceRule(**in_row.model_dump()))
        upserted += 1
    db.commit()
    return {"upserted": upserted}


@router.get("/vehicles", response_model=list[VehiclePriceModifierRead])
def list_vehicle_modifiers(
    _admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> list[VehiclePriceModifierRead]:
    return db.query(VehiclePriceModifier).order_by(VehiclePriceModifier.vehicle_type.asc()).all()


@router.post("/vehicles", response_model=VehiclePriceModifierRead, status_code=status.HTTP_201_CREATED)
def create_vehicle_modifier(
    payload: VehiclePriceModifierCreate,
    _admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> VehiclePriceModifierRead:
    row = VehiclePriceModifier(**payload.model_dump(), vehicle_type=payload.vehicle_type.lower())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.put("/vehicles/{modifier_id}", response_model=VehiclePriceModifierRead)
def update_vehicle_modifier(
    modifier_id: str,
    payload: VehiclePriceModifierUpdate,
    _admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> VehiclePriceModifierRead:
    row = db.get(VehiclePriceModifier, modifier_id)
    if not row:
        raise HTTPException(status_code=404, detail="Vehicle modifier not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return row


@router.get("/reserve/quote", response_model=ReserveQuoteRead)
def get_reserve_quote(
    pickup_area: str = Query(...),
    destination_area: str = Query(...),
    duration_hours: int = Query(..., ge=5, le=72),
    radius_km: int = Query(default=10, ge=1, le=10),
    pickup_lat: float | None = Query(default=None),
    pickup_lng: float | None = Query(default=None),
    vehicle_type: str = Query(default="car"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ReserveQuoteRead:
    if duration_hours < 5:
        raise HTTPException(status_code=400, detail="Reserve Car requires minimum 5 hours")
    if pickup_lat is None or pickup_lng is None:
        raise HTTPException(status_code=400, detail="Pickup coordinates required for reserve radius search")

    prices = (
        db.query(ReserveRoutePrice)
        .filter(ReserveRoutePrice.is_active.is_(True), ReserveRoutePrice.vehicle_type == vehicle_type.lower())
        .order_by(ReserveRoutePrice.created_at.desc())
        .all()
    )

    rows: list[ReserveQuoteRow] = []
    for p in prices:
        if not _route_match(p.route_from, p.route_to, pickup_area, destination_area):
            continue
        lat, lng = _latest_driver_location(db, p.driver_id)
        if lat is None or lng is None:
            continue
        dist = _distance_km(pickup_lat, pickup_lng, lat, lng)
        if dist is None or dist > radius_km:
            continue
        driver = db.get(User, p.driver_id)
        rows.append(
            ReserveQuoteRow(
                driver_id=p.driver_id,
                driver_name=driver.name if driver else None,
                driver_phone=driver.phone if driver else None,
                route_from=p.route_from,
                route_to=p.route_to,
                quoted_price=_price_for_duration(p, duration_hours),
                radius_km=max(1, int(round(dist))),
            )
        )

    if rows:
        # circular radius search 1..10, pick first radius with any availability
        selected_radius = radius_km
        filtered = rows
        for r in range(1, radius_km + 1):
            subset = [x for x in rows if x.radius_km <= r]
            if subset:
                selected_radius = r
                filtered = subset
                break
        min_price = min(r.quoted_price for r in filtered)
        max_price = max(r.quoted_price for r in filtered)
        return ReserveQuoteRead(
            route_from=pickup_area,
            route_to=destination_area,
            duration_hours=duration_hours,
            radius_km=selected_radius,
            nearby_driver_count=len(filtered),
            min_price=min_price,
            max_price=max_price,
            source="driver_defined",
            rows=filtered,
        )

    fallback_recent = _fallback_from_recent_trips(db, pickup_area, destination_area, duration_hours)
    if fallback_recent:
        return ReserveQuoteRead(
            route_from=pickup_area,
            route_to=destination_area,
            duration_hours=duration_hours,
            radius_km=10,
            nearby_driver_count=0,
            min_price=fallback_recent[0],
            max_price=fallback_recent[1],
            source="recent_trip_data",
            rows=[],
        )

    fallback_default = _fallback_from_defaults(db, pickup_area, destination_area, vehicle_type, duration_hours)
    if fallback_default:
        return ReserveQuoteRead(
            route_from=pickup_area,
            route_to=destination_area,
            duration_hours=duration_hours,
            radius_km=10,
            nearby_driver_count=0,
            min_price=fallback_default[0],
            max_price=fallback_default[1],
            source="admin_default",
            rows=[],
        )

    raise HTTPException(status_code=404, detail="No reserve pricing found for this route")


@router.get("/reserve/driver-prices/me", response_model=list[ReserveRoutePriceRead])
def list_my_reserve_prices(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[ReserveRoutePriceRead]:
    if current_user.role != "driver":
        raise HTTPException(status_code=403, detail="Driver access required")
    return (
        db.query(ReserveRoutePrice)
        .filter(ReserveRoutePrice.driver_id == current_user.id)
        .order_by(ReserveRoutePrice.created_at.desc())
        .all()
    )


@router.post("/reserve/driver-prices", response_model=ReserveRoutePriceRead, status_code=status.HTTP_201_CREATED)
def create_my_reserve_price(
    payload: ReserveRoutePriceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ReserveRoutePriceRead:
    if current_user.role != "driver":
        raise HTTPException(status_code=403, detail="Driver access required")
    row = ReserveRoutePrice(driver_id=current_user.id, **payload.model_dump(), vehicle_type=payload.vehicle_type.lower())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.put("/reserve/driver-prices/{price_id}", response_model=ReserveRoutePriceRead)
def update_my_reserve_price(
    price_id: str,
    payload: ReserveRoutePriceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ReserveRoutePriceRead:
    if current_user.role != "driver":
        raise HTTPException(status_code=403, detail="Driver access required")
    row = db.get(ReserveRoutePrice, price_id)
    if not row:
        raise HTTPException(status_code=404, detail="Reserve price not found")
    if row.driver_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, key, value.lower() if key == "vehicle_type" and isinstance(value, str) else value)
    db.commit()
    db.refresh(row)
    return row


@router.get("/reserve/admin/driver-prices", response_model=list[ReserveRoutePriceRead])
def list_all_reserve_prices(
    _admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> list[ReserveRoutePriceRead]:
    return db.query(ReserveRoutePrice).order_by(ReserveRoutePrice.created_at.desc()).all()


@router.get("/reserve/default-rates", response_model=list[ReserveDefaultRateRead])
def list_reserve_default_rates(
    _admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> list[ReserveDefaultRateRead]:
    return db.query(ReserveDefaultRate).order_by(ReserveDefaultRate.created_at.desc()).all()


@router.post("/reserve/default-rates", response_model=ReserveDefaultRateRead, status_code=status.HTTP_201_CREATED)
def create_reserve_default_rate(
    payload: ReserveDefaultRateCreate,
    _admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> ReserveDefaultRateRead:
    row = ReserveDefaultRate(**payload.model_dump(), vehicle_type=payload.vehicle_type.lower())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.put("/reserve/default-rates/{rate_id}", response_model=ReserveDefaultRateRead)
def update_reserve_default_rate(
    rate_id: str,
    payload: ReserveDefaultRateUpdate,
    _admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> ReserveDefaultRateRead:
    row = db.get(ReserveDefaultRate, rate_id)
    if not row:
        raise HTTPException(status_code=404, detail="Reserve default rate not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, key, value.lower() if key == "vehicle_type" and isinstance(value, str) else value)
    db.commit()
    db.refresh(row)
    return row
