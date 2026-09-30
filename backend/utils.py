import smtplib
import os
import random # NEW
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv
from passlib.context import CryptContext
from jose import jwt

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    # Strong random key for runtime security if missing in .env
    import secrets
    SECRET_KEY = secrets.token_hex(32)
    print("[WARNING] SECRET_KEY not found in .env! A temporary random key has been generated for this process runtime.")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8  # 8 hours session

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", truncate_error=False)

def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> dict:
    """Decodes and validates a JWT access token. Raises JWTError if invalid."""
    from jose import JWTError
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        raise e


def send_forgot_password_email(target_email: str):
    sender_email = os.getenv("EMAIL_ADDRESS")
    sender_password = os.getenv("EMAIL_APP_PASSWORD")

    if not sender_email or not sender_password:
        raise ValueError("Email credentials missing in .env file")

    message = MIMEMultipart("alternative")
    message["Subject"] = "Reset Your CTU Knowledge System Password"
    message["From"] = f"CTU Argao Support <{sender_email}>"
    message["To"] = target_email

    reset_link = f"http://localhost:5173/login?showReset=true&email={target_email}"

    html = f"""
    <html>
        <body style="font-family: Arial, sans-serif;">
            <div style="padding: 20px; border: 1px solid #ddd;">
                <h2>Password Reset</h2>
                <p>Click the link below to reset your password:</p>
                <a href="{reset_link}" style="background: #1D6FA3; color: white; padding: 10px; text-decoration: none;">Reset Password</a>
            </div>
        </body>
    </html>
    """
    message.attach(MIMEText(html, "html"))

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(sender_email, sender_password)
        server.sendmail(sender_email, target_email, message.as_string())

# --- NEW: OTP LOGIC ---
def generate_otp():
    return str(random.randint(100000, 999999))

def send_otp_email(target_email: str, otp_code: str):
    sender_email = os.getenv("EMAIL_ADDRESS", "ragadmin123@gmail.com")
    sender_password = os.getenv("EMAIL_APP_PASSWORD", "ragsample123")

    message = MIMEMultipart("alternative")
    message["Subject"] = f"Your CTU Knowledge System Verification Code: {otp_code}"
    message["From"] = f"CTU Argao Support <{sender_email}>"
    message["To"] = target_email

    html = f"""
    <html>
        <body style="font-family: Arial, sans-serif; background-color: #FAFAFA; padding: 20px;">
            <div style="padding: 30px; border: 1px solid #E5E7EB; border-radius: 12px; max-width: 480px; margin: 0 auto; background-color: #FFFFFF;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h2 style="color: #DD7230; margin: 0; font-size: 22px;">Email Verification</h2>
                    <p style="color: #6B7280; font-size: 14px; margin-top: 5px;">CTU Argao Institutional Knowledge System</p>
                </div>
                <p style="color: #4B5563; font-size: 14px; line-height: 1.5;">Use the following 6-digit code to verify your email address and complete your registration:</p>
                <div style="background-color: #FFF4E5; border: 1px solid #FFE0B2; padding: 18px; border-radius: 8px; text-align: center; margin: 24px 0;">
                    <h1 style="font-size: 36px; letter-spacing: 10px; color: #DD7230; margin: 0; font-weight: bold;">{otp_code}</h1>
                </div>
                <p style="color: #9CA3AF; font-size: 12px; text-align: center;">This code will expire in 10 minutes. If you did not request this, please disregard this email.</p>
            </div>
        </body>
    </html>
    """
    message.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, target_email, message.as_string())
        print(f"[OTP] Sent verification email to {target_email} (Code: {otp_code})")
    except Exception as e:
        print(f"[OTP] SMTP send failed: {e}. Active OTP code is: {otp_code}")