import os
from celery import Celery

# Use Redis as the broker and backend for Celery
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "bookmygadi_worker",
    broker=redis_url,
    backend=redis_url,
    include=["app.core.tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,         # Hard kill if task takes > 1 hour
    task_soft_time_limit=3000,    # Soft kill before hard kill to allow cleanup
    worker_prefetch_multiplier=1, # Recommended for fair distribution
    task_acks_late=True,          # Only ack after successful completion (prevents silent failures)
    task_reject_on_worker_lost=True,
    broker_connection_retry_on_startup=True,
    # Route failed tasks to a Dead Letter Queue (DLQ)
    task_routes={
        'app.core.tasks.*': {'queue': 'default'},
        'app.core.tasks.dlq_*': {'queue': 'dead_letter'},
    }
)
