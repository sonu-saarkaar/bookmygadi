from app.core.celery_app import celery_app
import logging
import time

@celery_app.task(bind=True, max_retries=3)
def process_ride_receipt(self, ride_id: str):
    """Example background task to generate PDF receipt and send via Email/WhatsApp using Celery Queue."""
    logging.info(f"Started processing receipt for ride {ride_id}")
    try:
        # Simulate heavy IO operation like PDF generation or sending email
        time.sleep(2)
        logging.info(f"Receipt for ride {ride_id} processed successfully.")
        return {"status": "success", "ride_id": ride_id}
    except Exception as exc:
        logging.error(f"Error processing receipt for {ride_id}: {exc}")
        raise self.retry(exc=exc, countdown=10)
