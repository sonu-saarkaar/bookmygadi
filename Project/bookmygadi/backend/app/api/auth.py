from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import string
import secrets

from app.api.deps import get_current_user
from app.core.security import create_access_token, get_password_hash, verify_password
from app.db import get_db
from app.models import User
from app.schemas import Token, UserCreate, UserLogin, UserRead, ForgotPasswordRequest

router = APIRouter(prefix="/auth", tags=["auth"])

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
    SENDER_PASSWORD = "put_app_password_here"      # <-- Your App Password
    
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
        if SENDER_PASSWORD == "put_app_password_here":
            # If the user hasn't configured the email yet, don't crash. 
            # Return it in the API so they can at least test login!
            print(f"!!! DEV MODE: Email not configured. The new password for {user.email} is: {new_raw_password} !!!")
            return {"message": f"DEV MODE: Email not configured! Your new password is: {new_raw_password}"}
            
        send_reset_email(user.email, user.name, new_raw_password)
        db.commit()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Email server error: You must configure the App Password in backend code! Error: {str(e)}")

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

    token = create_access_token(subject=user.id)
    return Token(access_token=token)


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)) -> Token:
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

from pydantic import BaseModel

class FcmTokenUpdate(BaseModel):
    fcm_token: str

@router.post("/fcm-token")
def update_fcm_token(payload: FcmTokenUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.fcm_token = payload.fcm_token
    db.commit()
    return {"message": "FCM token updated successfully"}
