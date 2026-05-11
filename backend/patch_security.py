import os

def patch_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements:
        if old in content:
            content = content.replace(old, new)
        else:
            print(f"Warning: '{old}' not found in {filepath}")
            
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

def main():
    # 1. Update app/schemas.py
    schemas_path = "app/schemas.py"
    schemas_replacements = [
        (
            "from pydantic import BaseModel, ConfigDict, EmailStr, Field",
            "from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator"
        ),
        (
            "class UserLogin(BaseModel):\n    email: EmailStr\n    password: str",
            "class UserLogin(BaseModel):\n    email: EmailStr | None = None\n    phone: str | None = None\n    password: str\n\n    @model_validator(mode='after')\n    def check_email_or_phone(self) -> 'UserLogin':\n        if not self.email and not self.phone:\n            raise ValueError('Either email or phone must be provided')\n        return self"
        )
    ]
    patch_file(schemas_path, schemas_replacements)

    # 2. Update app/api/common/auth.py
    auth_path = "app/api/common/auth.py"
    auth_replacements = [
        (
            "from app.schemas import Token, UserCreate, UserLogin, UserRead, ForgotPasswordRequest",
            "from app.schemas import Token, UserCreate, UserLogin, UserRead, ForgotPasswordRequest\nimport logging\n\nlogger = logging.getLogger(__name__)\n\nfrom app.core.limiter import limiter\nfrom fastapi import Request"
        ),
        (
            "@router.post(\"/login\", response_model=Token)\ndef login(payload: UserLogin, db: Session = Depends(get_db)) -> Token:\n    if _is_rate_limited(f\"login:{payload.email.lower().strip()}\", max_attempts=10, window_seconds=300):\n        raise HTTPException(status_code=429, detail=\"Too many login attempts. Try again in a few minutes.\")\n    user = db.query(User).filter(User.email == payload.email).first()\n    if not user or not verify_password(payload.password, user.password_hash):\n        raise HTTPException(status_code=401, detail=\"Invalid email or password\")",
            "@router.post(\"/login\", response_model=Token)\n@limiter.limit(\"5/minute\")\ndef login(request: Request, payload: UserLogin, db: Session = Depends(get_db)) -> Token:\n    identifier = payload.email.lower().strip() if payload.email else payload.phone.strip()\n    \n    if payload.email:\n        user = db.query(User).filter(User.email == payload.email).first()\n    else:\n        user = db.query(User).filter(User.phone == payload.phone).first()\n\n    if not user or not verify_password(payload.password, user.password_hash):\n        logger.warning(f\"Failed login attempt for {identifier}\")\n        raise HTTPException(status_code=401, detail=\"Invalid email or password\")\n"
        )
    ]
    patch_file(auth_path, auth_replacements)

    # 3. Update app/api/common/deps.py
    deps_path = "app/api/common/deps.py"
    deps_replacements = [
        (
            "from app.models import User",
            "from app.models import User\nimport logging\n\nlogger = logging.getLogger(__name__)"
        ),
        (
            "    user_id = decode_access_token(token)\n    if not user_id:\n        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=\"Invalid token\")",
            "    user_id = decode_access_token(token)\n    if not user_id:\n        logger.warning(\"Token validation failed\")\n        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=\"Invalid token\")"
        )
    ]
    patch_file(deps_path, deps_replacements)

    # 4. Update app/main.py
    main_path = "app/main.py"
    main_replacements = [
        (
            "from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect\nfrom fastapi.middleware.cors import CORSMiddleware",
            "from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect\nfrom fastapi.middleware.cors import CORSMiddleware\nfrom slowapi import _rate_limit_exceeded_handler\nfrom slowapi.errors import RateLimitExceeded\nfrom app.core.limiter import limiter\nimport logging"
        ),
        (
            "app = FastAPI(title=settings.app_name)",
            "app = FastAPI(title=settings.app_name)\nlogging.basicConfig(level=logging.INFO)\napp.state.limiter = limiter\napp.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)"
        )
    ]
    patch_file(main_path, main_replacements)

    # 5. Update app/core/config.py
    config_path = "app/core/config.py"
    config_replacements = [
        (
            "    cors_origins: list[str] = [\n        \"http://localhost:5173\",\n        \"https://bookmygadi.app\",\n        \"https://www.bookmygadi.app\",\n    ]",
            "    cors_origins: list[str] = [\n        \"https://bookmygadi.app\",\n        \"https://www.bookmygadi.app\",\n    ]"
        )
    ]
    patch_file(config_path, config_replacements)

if __name__ == "__main__":
    main()
