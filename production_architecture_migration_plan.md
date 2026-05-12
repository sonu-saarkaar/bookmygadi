# BookMyGadi Enterprise Backend Architecture & Migration Plan

This document details the transition from the prototype SQLite-based backend to a production-grade, highly available, secure architecture using PostgreSQL, Redis, and strict Nginx rate-limiting.

---

## 1. Zero-Trust Security & Observability

### A. Sentry PII Sanitization
Default Sentry configurations leak auth headers and cookies. The `telemetry.py` setup includes a `before_send` hook that filters out `authorization` and `cookie` headers automatically.

### B. Securing `/metrics` Endpoint
Exposing Prometheus `/metrics` to the public leaks infrastructure patterns. 
**Action:** Block `/metrics` in Nginx and restrict it to internal VPC IP ranges.

### C. Cloudflare IP Enforcement
To prevent IP spoofing, the FastAPI middleware ONLY trusts `CF-Connecting-IP` if the incoming request comes from a trusted internal local proxy (`127.0.0.1`). Nginx MUST be configured to only accept external traffic from official Cloudflare IP ranges.

---

## 2. PostgreSQL Migration & Connection Pooling

### Step 1: Initialize Alembic
Running `pip install psycopg2-binary` is NOT a migration. 
```bash
# Initialize Alembic
alembic init alembic

# Auto-generate schema migration from SQLAlchemy models
alembic revision --autogenerate -m "Initial schema"

# Apply to PostgreSQL
alembic upgrade head
```

### Step 2: Connection Pooling (PgBouncer)
Direct database connections will crash Postgres under heavy WebSocket load. Deploy `PgBouncer` in `Transaction Pooling` mode between FastAPI and PostgreSQL.
*   Update `.env`: `DATABASE_URL=postgresql://bmg_admin:PASSWORD@localhost:6432/bookmygadi_prod`

### Step 3: Database Backups
Create a daily cron job using `pg_dump`:
```bash
0 3 * * * pg_dump -U bmg_admin bookmygadi_prod | gzip > /backups/db_$(date +\%F).sql.gz
```

---

## 3. Redis Graceful Degradation & High Availability

**Risk:** If Redis goes down, `FastAPILimiter` and Celery queues will crash the main API.
**Solution:**
When initializing `FastAPILimiter` in FastAPI, wrap it in a circuit breaker or fallback mechanism. If Redis connects fail, the API should bypass rate-limiting rather than returning `500 Internal Server Error`.
For WebSockets, fallback to a local memory dictionary if PubSub fails, or gracefully disconnect clients with a "Reconnecting" event.

---

## 4. Celery Worker Management & Dead Letter Queues

Background workers require monitoring. A failed email task should not vanish silently.
*   **Retry Strategy:** Tasks like `process_ride_receipt` are decorated with `max_retries=3`.
*   **Soft Time Limits:** Workers are configured with `task_soft_time_limit=3000` to allow graceful cleanup before hard kill (`3600`).
*   **Dead Letter Queue (DLQ):** Failed tasks route to a `dead_letter` queue for manual inspection.
*   **Process Management:** Use `Supervisor` or `Systemd` with `Restart=always` for the Celery worker process.

---

## 5. Nginx Zero-Trust Configuration

**File:** `/etc/nginx/sites-available/bookmygadi`

```nginx
upstream fastapi_backend {
    server 127.0.0.1:8000;
    keepalive 32;
}

server {
    listen 80;
    server_name api.bookmygadi.app;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.bookmygadi.app;

    ssl_certificate /etc/letsencrypt/live/api.bookmygadi.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.bookmygadi.app/privkey.pem;

    # Block public access to Prometheus metrics
    location /metrics {
        allow 127.0.0.1;
        allow 10.0.0.0/8; # Your VPC Subnet
        deny all;
        proxy_pass http://fastapi_backend;
    }

    # Only allow Cloudflare IPs (Ensure this list is kept updated via Cloudflare's API)
    # allow 103.21.244.0/22;
    # allow 103.22.200.0/22;
    # deny all;

    location / {
        limit_req zone=bmg_api_limit burst=20 nodelay;
        
        proxy_pass http://fastapi_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket Support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## 6. Secrets Management

**Rule:** NEVER commit secrets to GitHub.
1.  **Environment Separation:** Use separate `.env.development` and `.env.production`.
2.  **Server Secrets:** On the VPS, `.env` file permissions must be locked down:
    `chmod 600 /opt/bookmygadi/backend/.env`
3.  **Future Enhancement:** Migrate to HashiCorp Vault or AWS Secrets Manager for dynamic secret injection.
