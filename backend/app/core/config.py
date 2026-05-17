from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


def _default_database_url() -> str:
    # Resolve backend root from this file so sqlite path is stable across cwd changes.
    backend_root = Path(__file__).resolve().parents[2]
    db_path = (backend_root / "bookmygadi.db").as_posix()
    return f"sqlite:///{db_path}"


def _env_file_path() -> str:
    return (Path(__file__).resolve().parents[2] / ".env").as_posix()


def _default_app_release_storage_dir() -> str:
    return (Path(__file__).resolve().parents[2] / "public" / "app-releases").as_posix()


class Settings(BaseSettings):
    app_name: str = "BookMyGadi API"
    app_env: str = "development"
    api_prefix: str = "/api/v1"
    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 60 * 24
    database_url: str = _default_database_url()
    cors_origins: list[str] = [
        "https://bookmygadi.app",
        "https://www.bookmygadi.app",
        "https://web.bookmygadi.app",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    mapbox_token: str = ""
    rider_app_api_key: str = "rider_app_linked_key_change_in_production"
    rider_default_driver_email: str = "driver@bookmygadi.com"
    mongo_url: str = "mongodb://127.0.0.1:27017"
    mongo_db_name: str = "bookmygadi_admin"
    admin_access_token_expire_minutes: int = 60 * 12
    app_release_storage_dir: str = _default_app_release_storage_dir()
    app_release_public_base_url: str = ""

    # ── New: Push Notifications ─────────────────────────────────────
    fcm_server_key: str = ""          # Firebase Legacy Server Key

    # ── New: Razorpay Payment ─────────────────────────────────────
    razorpay_key_id: str = ""         # rzp_live_xxxx or rzp_test_xxxx
    razorpay_key_secret: str = ""     # Razorpay key secret

    # Local instant rides: billable km cap (admin route still defines base segment & rates).
    local_instant_pricing_cap_km: float = 10.0
    # FCM dispatch: prefer drivers whose last live location is within this radius of pickup.
    dispatch_prefer_radius_km: float = 15.0

    # APITxT OTP SMS
    apitxt_authkey: str = "UQaW70R22lDj1hOmlwJ2si9k0BjHRWBFztafCiJehuI"
    apitxt_otp_endpoint: str = "https://www.apitxt.com/api/sendOTP"
    apitxt_otp_channel: str = "sms"
    apitxt_country: str = "91"
    apitxt_template_id: str = ""
    bmg_return_otp_in_response: bool = False

    model_config = SettingsConfigDict(
        env_file=_env_file_path(),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
