from .auth import router as auth_router
from .dashboard import router as dashboard_router
from .riders import router as riders_router
from .drivers import router as drivers_router
from .vehicles import router as vehicles_router
from .rides import router as rides_router
from .approvals import router as approvals_router
from .support import router as support_router
from .finance import router as finance_router
from .tasks import router as tasks_router
from .live import router as live_router
from .logs import router as logs_router

__all__ = [
    "auth_router",
    "dashboard_router",
    "riders_router",
    "drivers_router",
    "vehicles_router",
    "rides_router",
    "approvals_router",
    "support_router",
    "finance_router",
    "tasks_router",
    "live_router",
    "logs_router",
]
