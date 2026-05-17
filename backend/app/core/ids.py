import re
from typing import Any

from sqlalchemy.orm import Session


DEFAULT_DISTRICT_CODE = "05"
DEFAULT_ALPHA_CODE = "AA"


def normalize_public_id(value: Any) -> str:
    return str(value or "").strip().upper()


def public_user_id(seq: int) -> str:
    return f"BMG{seq:05d}"


def public_request_id(seq: int) -> str:
    return f"BMGRQ{seq:06d}"


def public_search_request_id(seq: int) -> str:
    return f"BMGSRQ{seq:06d}"


def public_ride_id(seq: int) -> str:
    return f"BMGRD{seq:06d}"


def public_payment_id(ride_public_id: str | None, seq: int | None = None) -> str:
    numeric = "".join(ch for ch in normalize_public_id(ride_public_id) if ch.isdigit())
    if numeric:
        return f"BMGPY{numeric[-6:].zfill(6)}"
    return f"BMGPY{int(seq or 1):06d}"


def public_rider_id(seq: int, district_code: str | None = None, alpha_code: str | None = None) -> str:
    district = "".join(ch for ch in str(district_code or DEFAULT_DISTRICT_CODE) if ch.isdigit())[-2:].zfill(2)
    letters = "".join(ch for ch in str(alpha_code or DEFAULT_ALPHA_CODE).upper() if ch.isalpha())[:2].ljust(2, "A")
    return f"BMGR{district}{letters}{seq:04d}"


def district_code_from_text(value: str | None) -> str:
    normalized = " ".join(str(value or "").lower().replace(",", " ").split())
    if not normalized:
        return DEFAULT_DISTRICT_CODE
    district_map = {
        "vadodara": "05",
        "baroda": "05",
        "varanasi": "09",
        "lucknow": "10",
        "delhi": "07",
    }
    for key, code in district_map.items():
        if key in normalized:
            return code
    return f"{sum(ord(ch) for ch in normalized if ch.isalnum()) % 100:02d}"


def _next_numeric_suffix(db: Session, model: type, column_name: str, prefix: str, width: int) -> int:
    column = getattr(model, column_name)
    max_seen = 0
    pattern = re.compile(rf"^{re.escape(prefix)}(\d{{{width}}})$")
    for (value,) in db.query(column).filter(column.isnot(None)).all():
        match = pattern.match(normalize_public_id(value))
        if match:
            max_seen = max(max_seen, int(match.group(1)))
    return max_seen + 1


def next_user_public_id(db: Session, user_model: type) -> str:
    seq = _next_numeric_suffix(db, user_model, "public_id", "BMG", 5)
    candidate = public_user_id(seq)
    while db.query(user_model).filter(user_model.public_id == candidate).first():
        seq += 1
        candidate = public_user_id(seq)
    return candidate


def next_request_public_id(db: Session, registration_model: type) -> str:
    seq = _next_numeric_suffix(db, registration_model, "request_public_id", "BMGRQ", 6)
    candidate = public_request_id(seq)
    while db.query(registration_model).filter(registration_model.request_public_id == candidate).first():
        seq += 1
        candidate = public_request_id(seq)
    return candidate


def next_ride_public_id(db: Session, ride_model: type) -> str:
    seq = _next_numeric_suffix(db, ride_model, "public_id", "BMGRD", 6)
    candidate = public_ride_id(seq)
    while db.query(ride_model).filter(ride_model.public_id == candidate).first():
        seq += 1
        candidate = public_ride_id(seq)
    return candidate


def next_search_public_id(db: Session, search_model: type) -> str:
    seq = _next_numeric_suffix(db, search_model, "public_id", "BMGSRQ", 6)
    candidate = public_search_request_id(seq)
    while db.query(search_model).filter(search_model.public_id == candidate).first():
        seq += 1
        candidate = public_search_request_id(seq)
    return candidate


def next_rider_public_id(db: Session, registration_model: type, area: str | None = None) -> str:
    district = district_code_from_text(area)
    prefix = f"BMGR{district}{DEFAULT_ALPHA_CODE}"
    seq = _next_numeric_suffix(db, registration_model, "rider_id_format", prefix, 4)
    if seq > 9999:
        seq = 1
    candidate = public_rider_id(seq, district)
    while db.query(registration_model).filter(registration_model.rider_id_format == candidate).first():
        seq += 1
        if seq > 9999:
            raise ValueError(f"Rider ID sequence exhausted for district {district}")
        candidate = public_rider_id(seq, district)
    return candidate
