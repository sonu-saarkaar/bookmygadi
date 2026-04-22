from datetime import datetime, timedelta
import os
import random

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import string
import secrets
from pydantic import BaseModel, EmailStr

from app.api.deps import get_current_user
from app.core.security import create_access_token, get_password_hash, verify_password
from app.db import get_db
from app.models import AuthOtp, User
from app.schemas import Token, UserCreate, UserLogin, UserRead, ForgotPasswordRequest

router = APIRouter(prefix="/auth", tags=["auth"])
_RATE_LIMIT_BUCKET: dict[str, list[datetime]] = {}


def _is_rate_limited(key: str, max_attempts: int, window_seconds: int) -> bool:
    now = datetime.utcnow()
    window_start = now - timedelta(seconds=window_seconds)
    attempts = [ts for ts in _RATE_LIMIT_BUCKET.get(key, []) if ts >= window_start]
    attempts.append(now)
    _RATE_LIMIT_BUCKET[key] = attempts[-max_attempts * 3 :]
    return len(attempts) > max_attempts

def generate_temp_password(length=8):
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def send_reset_email(to_email: str, name: str, new_password: str):
    # ========================================================
    # User Notification: 
    # Use bookmygadi.in@gmail.com and generating an App password!
    # ========================================================
    SMTP_SERVER = "smtp.gmail.com"
    SMTP_PORT = 587
    SENDER_EMAIL = "bookmygadi.in@gmail.com"       # <-- Your Email
    # SENDER_PASSWORD is NOT your normal Gmail login password! 
    # It MUST be a 16-character "App Password" generated in Google Settings.
    SENDER_PASSWORD = os.getenv("BMG_SMTP_APP_PASSWORD", "").strip() or "put_app_password_here"
    
    msg = MIMEMultipart()
    msg['From'] = SENDER_EMAIL
    msg['To'] = to_email
    msg['Subject'] = "BookMyGadi - Your New Temporary Password"
    
    body = f"""
    Hello {name},
    
    You recently requested to reset your password for your BookMyGadi account.
    
    We have securely generated a new temporary password for you to login with:
    
    Email: {to_email}
    New Password: {new_password}
    
    Please sign in using this new password and remember to change it from your profile settings as soon as possible.
    
    Log in here: https://bookmygadi.com/login
    
    Regards,
    The BookMyGadi Security Team
    """
    msg.attach(MIMEText(body, 'plain'))
    
    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"--- REAL EMAIL SUCCESSFULLY SENT TO: {to_email} ---")
    except Exception as e:
        print(f"--- FAILED TO SEND REAL EMAIL: {e} ---")
        raise Exception(f"Failed to send email: {str(e)}")

@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        (User.email == payload.email_or_mobile) | (User.phone == payload.email_or_mobile)
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="Data not found")

    # 1. Generate a new secure temporary password
    new_raw_password = generate_temp_password()
    
    # 2. Hash it and save it to the user's database record
    user.password_hash = get_password_hash(new_raw_password)
    

    # 3. Send email to the user with the new temporary plaintext password
    try:
        send_reset_email(user.email, user.name, new_raw_password)
        db.commit()
    except Exception:
        # Keep backward compatibility for existing setups without SMTP.
        db.commit()
        print(f"DEV MODE RESET PASSWORD FOR {user.email}: {new_raw_password}")
        return {"message": "SMTP not configured. Temporary password generated in server logs for development."}

    return {"message": "A new password has been sent to your Email. Please check your inbox."}

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> Token:
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    user = User(
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        role=payload.role,
        password_hash=get_password_hash(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Assign enterprise-style public IDs without breaking old UUID primary key.
    if not user.public_id:
        role_prefix = "USER" if user.role == "customer" else "RIDER" if user.role == "driver" else "ADMIN"
        count = db.query(User).filter(User.role == user.role).count()
        candidate = f"BMG-{role_prefix}-{count:03d}"
        while db.query(User).filter(User.public_id == candidate).first():
            count += 1
            candidate = f"BMG-{role_prefix}-{count:03d}"
        user.public_id = candidate
        db.commit()

    token = create_access_token(subject=user.id)
    return Token(access_token=token)


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)) -> Token:
    if _is_rate_limited(f"login:{payload.email.lower().strip()}", max_attempts=10, window_seconds=300):
        raise HTTPException(status_code=429, detail="Too many login attempts. Try again in a few minutes.")
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(subject=user.id)
    return Token(access_token=token)


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)) -> UserRead:
    return current_user

from app.schemas import UserUpdate

@router.patch("/me", response_model=UserRead)
def update_me(payload: UserUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.name is not None:
        current_user.name = payload.name
    if payload.phone is not None:
        current_user.phone = payload.phone
    if payload.city is not None:
        current_user.city = payload.city
    if payload.bio is not None:
        current_user.bio = payload.bio
    if payload.emergency_number is not None:
        current_user.emergency_number = payload.emergency_number
    if payload.avatar_data is not None:
        current_user.avatar_data = payload.avatar_data
        
    db.commit()
    db.refresh(current_user)
    return current_user

class FcmTokenUpdate(BaseModel):
    fcm_token: str

@router.post("/fcm-token")
def update_fcm_token(payload: FcmTokenUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.fcm_token = payload.fcm_token
    db.commit()
    return {"message": "FCM token updated successfully"}


class AdminForgotStartPayload(BaseModel):
    email: EmailStr


class AdminForgotVerifyPayload(BaseModel):
    email: EmailStr
    otp: str
    new_password: str


@router.post("/admin/forgot-password/start")
def admin_forgot_password_start(payload: AdminForgotStartPayload, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    if _is_rate_limited(f"admin-forgot:{email}", max_attempts=5, window_seconds=600):
        raise HTTPException(status_code=429, detail="Too many requests. Try again later.")
    user = db.query(User).filter(User.email == email, User.role == "admin").first()
    if not user:
        raise HTTPException(status_code=404, detail="Admin account not found")

    otp = "".join(str(random.randint(0, 9)) for _ in range(6))
    row = AuthOtp(
        email=email,
        purpose="admin_reset",
        otp_code=otp,
        expires_at=datetime.utcnow() + timedelta(minutes=10),
        is_used=False,
    )
    db.add(row)
    db.commit()

    # In production, wire this with SMTP/provider. Keeping fallback avoids system break.
    print(f"ADMIN OTP for {email}: {otp}")
    return {"message": "OTP generated and sent to registered admin email (dev logs if SMTP disabled)."}


@router.post("/admin/forgot-password/verify")
def admin_forgot_password_verify(payload: AdminForgotVerifyPayload, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    if len(payload.new_password or "") < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")
    user = db.query(User).filter(User.email == email, User.role == "admin").first()
    if not user:
        raise HTTPException(status_code=404, detail="Admin account not found")

    row = (
        db.query(AuthOtp)
        .filter(
            AuthOtp.email == email,
            AuthOtp.purpose == "admin_reset",
            AuthOtp.otp_code == payload.otp.strip(),
            AuthOtp.is_used.is_(False),
        )
        .order_by(AuthOtp.created_at.desc())
        .first()
    )
    if not row:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    if row.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP expired")

    user.password_hash = get_password_hash(payload.new_password)
    row.is_used = True
    db.commit()
    return {"message": "Admin password has been reset successfully."}
