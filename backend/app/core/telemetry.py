import logging
import os
from fastapi import FastAPI

def setup_telemetry(app: FastAPI) -> None:
    """Setup Enterprise Telemetry: Sentry, Prometheus, and Loki."""
    
    # 1. Sentry (Error Tracking)
    try:
        import sentry_sdk
        
        def scrub_pii(event, hint):
            # Sanitize sensitive headers and data before sending to Sentry
            if 'request' in event and 'headers' in event['request']:
                headers = event['request']['headers']
                if 'authorization' in headers:
                    headers['authorization'] = '[Filtered]'
                if 'cookie' in headers:
                    headers['cookie'] = '[Filtered]'
            return event

        sentry_dsn = os.getenv("SENTRY_DSN")
        if sentry_dsn:
            sentry_sdk.init(
                dsn=sentry_dsn,
                traces_sample_rate=1.0,
                profiles_sample_rate=1.0,
                environment=os.getenv("APP_ENV", "development"),
                before_send=scrub_pii,
            )
            logging.info("✅ Sentry Error Tracking initialized")
    except ImportError:
        logging.warning("⚠️ sentry-sdk not installed. Skipping Sentry setup.")

    # 2. Prometheus (Metrics & Grafana Monitoring)
    try:
        from prometheus_fastapi_instrumentator import Instrumentator
        # This will expose /metrics endpoint for Prometheus to scrape
        Instrumentator().instrument(app).expose(app, include_in_schema=False, tags=["telemetry"])
        logging.info("✅ Prometheus metrics exposed at /metrics")
    except ImportError:
        logging.warning("⚠️ prometheus-fastapi-instrumentator not installed. Skipping Prometheus setup.")

    # 3. Grafana Loki (Centralized Logs)
    try:
        import logging_loki
        loki_url = os.getenv("LOKI_URL") # e.g. http://loki:3100/loki/api/v1/push
        if loki_url:
            handler = logging_loki.LokiHandler(
                url=loki_url,
                tags={"application": "bookmygadi", "env": os.getenv("APP_ENV", "development")},
                version="1",
            )
            logging.getLogger().addHandler(handler)
            logging.info("✅ Loki logging handler added for distributed log streaming")
    except ImportError:
        logging.warning("⚠️ python-logging-loki not installed. Skipping Loki setup.")
