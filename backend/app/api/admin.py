import os
import platform
import shutil
import time
from collections import defaultdict
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import case, func, or_, text
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_admin_user
from app.db import get_db
from app.models import AdminAuditLog, AdminSupportTicket, AdminTask, Ride, RiderVehicleRegistration, User, VehicleInventory
from app.schemas import (
    AdminAuditLogRead,
    AdminAlertRead,
    AdminAreaLoadRead,
    AdminDashboardRead,
    AdminRideOpsRead,
    AdminSupportTicketAssign,
    AdminSupportTicketCreate,
    AdminSupportTicketRead,
    AdminSupportTicketStatusUpdate,
    AdminTicketActionUpdate,
    AdminSystemHealthRead,
    AdminTaskAssign,
    AdminTaskCreate,
    AdminTaskRead,
    AdminTaskStatusUpdate,
    AdminUserOpsRead,
    AdminUserRoleUpdate,
    UserRead,
)


router = APIRouter(prefix="/admin", tags=["admin"])
APP_START_TS = time.time()
ACTIVE_RIDE_STATUSES = {"accepted", "arriving", "in_progress"}


class RiderBlockPayload(BaseModel):
    reason: str | None = None


def _log_admin_action(db: Session, admin: User, module: str, action: str, status: str = "success") -> None:
    db.add(
        AdminAuditLog(
            module=module,
            action=action,
            admin_id=admin.id,
            admin_name=admin.name,
            admin_role=admin.role,
            status=status,
        )
    )


def _ride_price_value(ride: Ride) -> int:
    return int(ride.agreed_fare or ride.requested_fare or ride.estimated_fare_max or ride.estimated_fare_min or 0)


def _build_dashboard(db: Session) -> AdminDashboardRead:
    total_users = db.query(User).count()
    total_customers = db.query(User).filter(User.role == "customer").count()
    total_riders = db.query(User).filter(User.role == "driver").count()
    total_admins = db.query(User).filter(User.role == "admin").count()

    rides = db.query(Ride).all()
    total_rides = len(rides)
    rides_pending = sum(1 for r in rides if (r.status or "").lower() == "pending")
    rides_active = sum(1 for r in rides if (r.status or "").lower() in ACTIVE_RIDE_STATUSES)
    rides_completed = sum(1 for r in rides if (r.status or "").lower() == "completed")
    rides_cancelled = sum(1 for r in rides if (r.status or "").lower() == "cancelled")
    rides_rejected = sum(1 for r in rides if (r.status or "").lower() == "rejected")

    payments_paid_count = sum(1 for r in rides if (r.payment_status or "").lower() == "paid")
    payments_unpaid_count = max(total_rides - payments_paid_count, 0)
    gmv_paid = sum(_ride_price_value(r) for r in rides if (r.payment_status or "").lower() == "paid")
    gmv_unpaid = sum(_ride_price_value(r) for r in rides if (r.payment_status or "").lower() != "paid")

    total_vehicles = db.query(VehicleInventory).count()
    active_vehicles = db.query(VehicleInventory).filter(VehicleInventory.is_active.is_(True)).count()
    pending_vehicle_registrations = db.query(RiderVehicleRegistration).filter(RiderVehicleRegistration.status == "pending").count()

    total_resolved = rides_completed + rides_cancelled + rides_rejected
    completion_rate = round((rides_completed / total_resolved) * 100, 2) if total_resolved > 0 else 0.0
    cancel_rate = round(((rides_cancelled + rides_rejected) / total_resolved) * 100, 2) if total_resolved > 0 else 0.0

    twenty_four_hours_ago = datetime.utcnow().timestamp() - (24 * 60 * 60)
    rides_last_24h = sum(1 for r in rides if r.created_at.timestamp() >= twenty_four_hours_ago)

    alerts: list[AdminAlertRead] = []
    if rides_pending >= 10:
        alerts.append(
            AdminAlertRead(
                severity="high",
                title="High Pending Demand",
                message=f"{rides_pending} rides are waiting for rider action.",
                metric_value=float(rides_pending),
            )
        )
    if rides_active > active_vehicles:
        alerts.append(
            AdminAlertRead(
                severity="medium",
                title="Capacity Stress",
                message="Active rides are higher than active vehicles configured.",
                metric_value=float(rides_active - active_vehicles),
            )
        )
    if payments_unpaid_count >= 5:
        alerts.append(
            AdminAlertRead(
                severity="medium",
                title="Payment Follow-up Needed",
                message=f"{payments_unpaid_count} rides are still unpaid.",
                metric_value=float(payments_unpaid_count),
            )
        )
    if pending_vehicle_registrations > 0:
        alerts.append(
            AdminAlertRead(
                severity="low",
                title="Pending Rider KYC",
                message=f"{pending_vehicle_registrations} rider vehicle registration requests are pending.",
                metric_value=float(pending_vehicle_registrations),
            )
        )

    return AdminDashboardRead(
        total_users=total_users,
        total_customers=total_customers,
        total_riders=total_riders,
        total_admins=total_admins,
        total_rides=total_rides,
        rides_pending=rides_pending,
        rides_active=rides_active,
        rides_completed=rides_completed,
        rides_cancelled=rides_cancelled,
        rides_rejected=rides_rejected,
        total_vehicles=total_vehicles,
        active_vehicles=active_vehicles,
        pending_vehicle_registrations=pending_vehicle_registrations,
        payments_paid_count=payments_paid_count,
        payments_unpaid_count=payments_unpaid_count,
        gmv_paid=gmv_paid,
        gmv_unpaid=gmv_unpaid,
        completion_rate=completion_rate,
        cancel_rate=cancel_rate,
        rides_last_24h=rides_last_24h,
        alerts=alerts,
    )


@router.get("/dashboard", response_model=AdminDashboardRead)
def admin_dashboard(_: User = Depends(get_admin_user), db: Session = Depends(get_db)) -> AdminDashboardRead:
    return _build_dashboard(db)


@router.get("/area-load", response_model=list[AdminAreaLoadRead])
def admin_area_load(
    limit: int = Query(default=25, ge=1, le=100),
    _: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> list[AdminAreaLoadRead]:
    rides = (
        db.query(Ride)
        .options(joinedload(Ride.preference))
        .order_by(Ride.created_at.desc())
        .limit(2500)
        .all()
    )
    area_stats: dict[str, dict] = defaultdict(
        lambda: {
            "total_requests": 0,
            "pending": 0,
            "active": 0,
            "completed": 0,
            "cancelled": 0,
            "rejected": 0,
            "requested_total": 0,
            "requested_count": 0,
            "agreed_total": 0,
            "agreed_count": 0,
            "last_request_at": None,
        }
    )

    for ride in rides:
        area = ((ride.preference.pickup_area if ride.preference else None) or ride.pickup_location or "Unknown").strip() or "Unknown"
        row = area_stats[area]
        row["total_requests"] += 1
        status = (ride.status or "").lower()
        if status == "pending":
            row["pending"] += 1
        elif status in ACTIVE_RIDE_STATUSES:
            row["active"] += 1
        elif status == "completed":
            row["completed"] += 1
        elif status == "cancelled":
            row["cancelled"] += 1
        elif status == "rejected":
            row["rejected"] += 1
        if ride.requested_fare is not None:
            row["requested_total"] += ride.requested_fare
            row["requested_count"] += 1
        if ride.agreed_fare is not None:
            row["agreed_total"] += ride.agreed_fare
            row["agreed_count"] += 1
        if row["last_request_at"] is None or ride.created_at > row["last_request_at"]:
            row["last_request_at"] = ride.created_at

    out: list[AdminAreaLoadRead] = []
    for area, data in area_stats.items():
        avg_requested = round(data["requested_total"] / data["requested_count"], 2) if data["requested_count"] else None
        avg_agreed = round(data["agreed_total"] / data["agreed_count"], 2) if data["agreed_count"] else None
        out.append(
            AdminAreaLoadRead(
                area=area,
                total_requests=data["total_requests"],
                pending=data["pending"],
                active=data["active"],
                completed=data["completed"],
                cancelled=data["cancelled"],
                rejected=data["rejected"],
                avg_requested_fare=avg_requested,
                avg_agreed_fare=avg_agreed,
                last_request_at=data["last_request_at"],
            )
        )

    out.sort(key=lambda x: (x.pending + x.active, x.total_requests), reverse=True)
    return out[:limit]


@router.get("/rides", response_model=list[AdminRideOpsRead])
def admin_rides(
    status: str | None = Query(default=None),
    q: str | None = Query(default=None),
    limit: int = Query(default=80, ge=1, le=300),
    _: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> list[AdminRideOpsRead]:
    query = (
        db.query(Ride)
        .options(joinedload(Ride.customer), joinedload(Ride.driver), joinedload(Ride.preference))
        .order_by(Ride.created_at.desc())
    )
    if status:
        query = query.filter(func.lower(Ride.status) == status.lower().strip())
    if q:
        key = f"%{q.strip()}%"
        query = query.filter(or_(Ride.pickup_location.ilike(key), Ride.destination.ilike(key), Ride.id.ilike(key)))

    rows = query.limit(limit).all()
    out: list[AdminRideOpsRead] = []
    for ride in rows:
        out.append(
            AdminRideOpsRead(
                id=ride.id,
                customer_id=ride.customer_id,
                customer_name=ride.customer.name if ride.customer else None,
                customer_phone=ride.customer.phone if ride.customer else None,
                customer_email=ride.customer.email if ride.customer else None,
                driver_id=ride.driver_id,
                driver_name=ride.driver.name if ride.driver else None,
                driver_phone=ride.driver.phone if ride.driver else None,
                pickup_location=ride.pickup_location,
                destination=ride.destination,
                pickup_area=ride.preference.pickup_area if ride.preference else None,
                vehicle_type=ride.vehicle_type,
                status=ride.status,
                payment_status=ride.payment_status,
                requested_fare=ride.requested_fare,
                agreed_fare=ride.agreed_fare,
                estimated_fare_min=ride.estimated_fare_min,
                estimated_fare_max=ride.estimated_fare_max,
                urgency_type=ride.preference.urgency_type if ride.preference else None,
                created_at=ride.created_at,
                updated_at=ride.updated_at,
            )
        )
    return out


@router.get("/users", response_model=list[AdminUserOpsRead])
def admin_users(
    role: str | None = Query(default=None),
    q: str | None = Query(default=None),
    limit: int = Query(default=120, ge=1, le=400),
    _: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> list[AdminUserOpsRead]:
    query = db.query(User).order_by(User.created_at.desc())
    if role:
        query = query.filter(User.role == role.strip().lower())
    if q:
        key = f"%{q.strip()}%"
        query = query.filter(or_(User.name.ilike(key), User.email.ilike(key), User.phone.ilike(key)))
    users = query.limit(limit).all()
    if not users:
        return []

    user_ids = [u.id for u in users]

    customer_stats_rows = (
        db.query(
            Ride.customer_id.label("user_id"),
            func.count(Ride.id).label("total"),
            func.max(Ride.created_at).label("last_ride_at"),
            func.sum(case((func.lower(Ride.status) == "completed", 1), else_=0)).label("completed"),
            func.sum(case((func.lower(Ride.status).in_(["cancelled", "rejected"]), 1), else_=0)).label("cancelled"),
        )
        .filter(Ride.customer_id.in_(user_ids))
        .group_by(Ride.customer_id)
        .all()
    )
    driver_stats_rows = (
        db.query(
            Ride.driver_id.label("user_id"),
            func.count(Ride.id).label("total"),
            func.max(Ride.created_at).label("last_ride_at"),
            func.sum(case((func.lower(Ride.status) == "completed", 1), else_=0)).label("completed"),
            func.sum(case((func.lower(Ride.status).in_(["cancelled", "rejected"]), 1), else_=0)).label("cancelled"),
        )
        .filter(Ride.driver_id.in_(user_ids))
        .group_by(Ride.driver_id)
        .all()
    )

    customer_stats = {row.user_id: row for row in customer_stats_rows}
    driver_stats = {row.user_id: row for row in driver_stats_rows}

    out: list[AdminUserOpsRead] = []
    for user in users:
        c = customer_stats.get(user.id)
        d = driver_stats.get(user.id)
        total_rides = int((c.total if c else 0) + (d.total if d else 0))
        completed_rides = int((c.completed if c else 0) + (d.completed if d else 0))
        cancelled_rides = int((c.cancelled if c else 0) + (d.cancelled if d else 0))
        last_ride_at = None
        if c and c.last_ride_at and d and d.last_ride_at:
            last_ride_at = c.last_ride_at if c.last_ride_at >= d.last_ride_at else d.last_ride_at
        elif c and c.last_ride_at:
            last_ride_at = c.last_ride_at
        elif d and d.last_ride_at:
            last_ride_at = d.last_ride_at

        out.append(
            AdminUserOpsRead(
                id=user.id,
                name=user.name,
                email=user.email,
                phone=user.phone,
                role=user.role,
                created_at=user.created_at,
                total_rides=total_rides,
                completed_rides=completed_rides,
                cancelled_rides=cancelled_rides,
                last_ride_at=last_ride_at,
            )
        )
    return out


@router.patch("/users/{user_id}/role", response_model=UserRead)
def admin_update_user_role(
    user_id: str,
    payload: AdminUserRoleUpdate,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> UserRead:
    row = db.get(User, user_id)
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    if row.id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot change your own role from admin panel")

    row.role = payload.role
    db.commit()
    db.refresh(row)
    return row


@router.get("/system-health", response_model=AdminSystemHealthRead)
def admin_system_health(_: User = Depends(get_admin_user), db: Session = Depends(get_db)) -> AdminSystemHealthRead:
    db_status = "ok"
    db_error = None
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:  # pragma: no cover
        db_status = "degraded"
        db_error = str(exc)

    db_path = db.bind.url.database if db.bind is not None else None
    db_size_mb = 0.0
    disk_total_gb = 0.0
    disk_used_gb = 0.0
    disk_free_gb = 0.0
    if db_path:
        abs_db_path = os.path.abspath(db_path)
        if os.path.exists(abs_db_path):
            db_size_mb = round(os.path.getsize(abs_db_path) / (1024 * 1024), 2)
            disk = shutil.disk_usage(os.path.dirname(abs_db_path))
            disk_total_gb = round(disk.total / (1024**3), 2)
            disk_used_gb = round(disk.used / (1024**3), 2)
            disk_free_gb = round(disk.free / (1024**3), 2)

    warnings: list[str] = []
    if db_status != "ok":
        warnings.append(f"Database connection issue: {db_error or 'unknown error'}")
    if disk_free_gb > 0 and disk_free_gb < 2:
        warnings.append("Low disk space: less than 2 GB available.")

    summary = _build_dashboard(db)
    if summary.rides_pending >= 10:
        warnings.append(f"High pending ride queue: {summary.rides_pending}.")
    if summary.payments_unpaid_count >= 5:
        warnings.append(f"Pending unpaid rides: {summary.payments_unpaid_count}.")

    status_value = "ok" if not warnings else "degraded"
    return AdminSystemHealthRead(
        status=status_value,
        server_time=datetime.utcnow(),
        uptime_seconds=round(time.time() - APP_START_TS, 2),
        db_status=db_status,
        db_size_mb=db_size_mb,
        disk_total_gb=disk_total_gb,
        disk_used_gb=disk_used_gb,
        disk_free_gb=disk_free_gb,
        python_version=platform.python_version(),
        platform=platform.platform(),
        warnings=warnings,
    )


@router.get("/riders", response_model=list[dict])
def admin_riders(
    q: str | None = Query(default=None),
    _: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    query = db.query(User).filter(User.role == "customer")
    if q:
        key = f"%{q.strip()}%"
        query = query.filter(or_(User.name.ilike(key), User.email.ilike(key), User.phone.ilike(key)))
    rows = query.order_by(User.created_at.desc()).limit(250).all()
    return [
        {
            "id": row.id,
            "name": row.name,
            "phone": row.phone,
            "city": "-",
            "status": "blocked" if row.is_blocked else "active",
        }
        for row in rows
    ]


@router.patch("/riders/{user_id}/block", response_model=dict)
def admin_block_rider(
    user_id: str,
    payload: RiderBlockPayload | None = None,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> dict:
    row = db.get(User, user_id)
    if not row or row.role != "customer":
        raise HTTPException(status_code=404, detail="Rider not found")
    row.is_blocked = True
    row.blocked_reason = (payload.reason if payload else None) or "Blocked by admin"
    _log_admin_action(db, admin, "riders", f"Blocked rider {row.id}", "warning")
    db.commit()
    return {"ok": True}


@router.patch("/riders/{user_id}/unblock", response_model=dict)
def admin_unblock_rider(
    user_id: str,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> dict:
    row = db.get(User, user_id)
    if not row or row.role != "customer":
        raise HTTPException(status_code=404, detail="Rider not found")
    row.is_blocked = False
    _log_admin_action(db, admin, "riders", f"Unblocked rider {row.id}")
    db.commit()
    return {"ok": True}


@router.get("/drivers", response_model=list[dict])
def admin_drivers(
    _: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    rows = db.query(User).filter(User.role == "driver").order_by(User.created_at.desc()).limit(250).all()
    return [
        {
            "id": row.id,
            "name": row.name,
            "phone": row.phone,
            "city": "-",
            "rating": 4.6,
            "status": row.driver_status or "pending_review",
        }
        for row in rows
    ]


@router.post("/drivers/{user_id}/approve", response_model=dict)
def admin_approve_driver(
    user_id: str,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> dict:
    row = db.get(User, user_id)
    if not row or row.role != "driver":
        raise HTTPException(status_code=404, detail="Driver not found")
    row.driver_status = "approved"
    _log_admin_action(db, admin, "drivers", f"Approved driver {row.id}")
    db.commit()
    return {"ok": True}


@router.post("/drivers/{user_id}/reject", response_model=dict)
def admin_reject_driver(
    user_id: str,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> dict:
    row = db.get(User, user_id)
    if not row or row.role != "driver":
        raise HTTPException(status_code=404, detail="Driver not found")
    row.driver_status = "rejected"
    _log_admin_action(db, admin, "drivers", f"Rejected driver {row.id}", "danger")
    db.commit()
    return {"ok": True}


@router.get("/vehicles", response_model=list[dict])
def admin_vehicles(
    _: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    rows = db.query(VehicleInventory).order_by(VehicleInventory.created_at.desc()).limit(400).all()
    return [
        {
            "id": row.id,
            "number_plate": row.id[:8].upper(),
            "model": row.model_name,
            "city": row.area,
            "status": "active" if row.is_active else "pending",
        }
        for row in rows
    ]


@router.post("/vehicles/{vehicle_id}/approve", response_model=dict)
def admin_approve_vehicle(
    vehicle_id: str,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> dict:
    row = db.get(VehicleInventory, vehicle_id)
    if not row:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    row.is_active = True
    _log_admin_action(db, admin, "vehicles", f"Approved vehicle {row.id}")
    db.commit()
    return {"ok": True}


@router.get("/support/tickets", response_model=list[AdminSupportTicketRead])
def admin_list_tickets(
    _: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> list[AdminSupportTicketRead]:
    return db.query(AdminSupportTicket).order_by(AdminSupportTicket.created_at.desc()).all()


@router.post("/support/tickets", response_model=AdminSupportTicketRead)
def admin_create_ticket(
    payload: AdminSupportTicketCreate,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> AdminSupportTicketRead:
    row = AdminSupportTicket(
        title=payload.title,
        description=payload.description,
        category=payload.category,
        severity=payload.severity,
        status="open",
        created_by=payload.created_by or admin.name,
    )
    db.add(row)
    _log_admin_action(db, admin, "support", f"Created support ticket {payload.title}")
    db.commit()
    db.refresh(row)
    return row


@router.patch("/support/tickets/{ticket_id}/assign", response_model=AdminSupportTicketRead)
def admin_assign_ticket(
    ticket_id: str,
    payload: AdminSupportTicketAssign,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> AdminSupportTicketRead:
    row = db.get(AdminSupportTicket, ticket_id)
    if not row:
        raise HTTPException(status_code=404, detail="Ticket not found")
    row.assigned_to = payload.assignee_admin_id
    _log_admin_action(db, admin, "support", f"Assigned ticket {ticket_id} to {payload.assignee_admin_id}")
    db.commit()
    db.refresh(row)
    return row


@router.patch("/support/tickets/{ticket_id}/status", response_model=AdminSupportTicketRead)
def admin_update_ticket_status(
    ticket_id: str,
    payload: AdminSupportTicketStatusUpdate,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> AdminSupportTicketRead:
    row = db.get(AdminSupportTicket, ticket_id)
    if not row:
        raise HTTPException(status_code=404, detail="Ticket not found")
    row.status = payload.status
    if payload.status in ("resolved", "closed"):
        row.resolved_at = datetime.utcnow()
    _log_admin_action(db, admin, "support", f"Updated ticket {ticket_id} status to {payload.status}")
    db.commit()
    db.refresh(row)
    return row


@router.patch("/support/tickets/{ticket_id}/action", response_model=AdminSupportTicketRead)
def admin_ticket_action(
    ticket_id: str,
    payload: AdminTicketActionUpdate,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> AdminSupportTicketRead:
    """Unified admin action: respond, dispatch emergency, assign vehicle/agent, update status."""
    row = db.get(AdminSupportTicket, ticket_id)
    if not row:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if payload.admin_response is not None:
        row.admin_response = payload.admin_response
    if payload.emergency_dispatched is not None:
        row.emergency_dispatched = payload.emergency_dispatched
    if payload.assigned_vehicle_id is not None:
        row.assigned_vehicle_id = payload.assigned_vehicle_id
    if payload.assigned_to is not None:
        row.assigned_to = payload.assigned_to
    if payload.status is not None:
        row.status = payload.status
        if payload.status in ("resolved", "closed"):
            row.resolved_at = datetime.utcnow()

    _log_admin_action(
        db, admin, "support",
        f"Action on ticket {ticket_id}: emergency={payload.emergency_dispatched}, vehicle={payload.assigned_vehicle_id}, status={payload.status}"
    )
    db.commit()
    db.refresh(row)
    return row


@router.get("/tasks", response_model=list[AdminTaskRead])
def admin_list_tasks(
    _: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> list[AdminTaskRead]:
    return db.query(AdminTask).order_by(AdminTask.created_at.desc()).all()


@router.post("/tasks", response_model=AdminTaskRead)
def admin_create_task(
    payload: AdminTaskCreate,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> AdminTaskRead:
    row = AdminTask(
        title=payload.title,
        type=payload.type,
        priority=payload.priority,
        status="todo",
        assignee_admin_id=payload.assignee_admin_id,
        details=payload.details,
    )
    db.add(row)
    _log_admin_action(db, admin, "tasks", f"Created task {payload.title}")
    db.commit()
    db.refresh(row)
    return row


@router.patch("/tasks/{task_id}/assign", response_model=AdminTaskRead)
def admin_assign_task(
    task_id: str,
    payload: AdminTaskAssign,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> AdminTaskRead:
    row = db.get(AdminTask, task_id)
    if not row:
        raise HTTPException(status_code=404, detail="Task not found")
    row.assignee_admin_id = payload.assignee_admin_id
    _log_admin_action(db, admin, "tasks", f"Assigned task {task_id} to {payload.assignee_admin_id}")
    db.commit()
    db.refresh(row)
    return row


@router.patch("/tasks/{task_id}/status", response_model=AdminTaskRead)
def admin_update_task_status(
    task_id: str,
    payload: AdminTaskStatusUpdate,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> AdminTaskRead:
    row = db.get(AdminTask, task_id)
    if not row:
        raise HTTPException(status_code=404, detail="Task not found")
    row.status = payload.status
    _log_admin_action(db, admin, "tasks", f"Updated task {task_id} status to {payload.status}")
    db.commit()
    db.refresh(row)
    return row


@router.get("/logs", response_model=list[AdminAuditLogRead])
def admin_logs(
    _: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> list[AdminAuditLogRead]:
    return db.query(AdminAuditLog).order_by(AdminAuditLog.created_at.desc()).limit(300).all()
