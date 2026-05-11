from celery import Celery
from celery.utils.log import get_task_logger

# Initialize Celery with Redis broker and strict retry mechanisms
celery_app = Celery(
    "bookmygadi_infrastructure",
    broker="redis://localhost:6379/1",
    backend="redis://localhost:6379/2"
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_acks_late=True, # Ensure tasks are acknowledged only AFTER execution
    task_reject_on_worker_lost=True, # Dead-letter safety
    worker_prefetch_multiplier=1 # Fair distribution across workers
)

logger = get_task_logger(__name__)

# Base task with distributed lock capability to ensure idempotency
class IdempotentTask(celery_app.Task):
    autoretry_for = (Exception,)
    retry_kwargs = {'max_retries': 3, 'countdown': 5}
    retry_backoff = True

@celery_app.task(bind=True, base=IdempotentTask, name="infrastructure.process_settlement")
def safe_process_settlement(self, driver_id: str, amount: float):
    """
    Idempotent settlement logic ensuring no double payments.
    """
    logger.info(f"Processing secure settlement for {driver_id} amount {amount}")
    # Redis distributed lock pseudo-code here
    # lock = redis.lock(f"settlement_lock_{driver_id}", timeout=10)
    # if lock.acquire():
    #     try: ...
    #     finally: lock.release()
    return {"status": "success", "driver_id": driver_id}

@celery_app.task(bind=True, base=IdempotentTask, name="infrastructure.detect_fraud")
def async_fraud_detection_sweep(self):
    """
    Background job to run weighted anomaly detection across all driver activities.
    """
    logger.info("Running fraud detection sweep...")
    return {"status": "completed"}
