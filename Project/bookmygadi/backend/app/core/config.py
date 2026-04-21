from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "BookMyGadi API"
    app_env: str = "development"
    api_prefix: str = "/api/v1"
    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 60 * 24
    database_url: str = "sqlite:///./bookmygadi.db"
    cors_origins: list[str] = [
        "http://localhost:5173",
        "https://bookmygadi.app",
        "https://www.bookmygadi.app",
    ]
    mapbox_token: str = ""
    rider_app_api_key: str = "rider_app_linked_key_change_in_production"
    rider_default_driver_email: str = "driver@bookmygadi.com"
    mongo_url: str = "mongodb://127.0.0.1:27017"
    mongo_db_name: str = "bookmygadi_admin"
    admin_access_token_expire_minutes: int = 60 * 12

    # ── New: Push Notifications ─────────────────────────────────────
    fcm_server_key: str = ""          # Firebase Legacy Server Key

    # ── New: Razorpay Payment ─────────────────────────────────────
    razorpay_key_id: str = ""         # rzp_live_xxxx or rzp_test_xxxx
    razorpay_key_secret: str = ""     # Razorpay key secret

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
