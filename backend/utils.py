import smtplib
import os
import secrets
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
from dotenv import load_dotenv
from passlib.context import CryptContext
from jose import jwt

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY must be configured before starting the backend.")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8  # 8 hours session

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", truncate_error=False)

def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)


def _send_email(target_email: str, subject: str, html: str, text: str):
    """Send an email through the configured SMTP server.

    Gmail remains the default, so the capstone can continue using the existing
    free Gmail app password. SMTP settings are configurable for another
    provider later, and refused recipients are surfaced instead of being
    silently reported as successful.
    """
    sender_email = (os.getenv("EMAIL_ADDRESS") or "").strip()
    sender_password = (os.getenv("EMAIL_APP_PASSWORD") or "").replace(" ", "").strip()
    smtp_host = (os.getenv("EMAIL_SMTP_HOST") or "smtp.gmail.com").strip()
    smtp_port = int(os.getenv("EMAIL_SMTP_PORT") or "465")

    if not sender_email or not sender_password:
        raise ValueError("Email credentials missing in .env file")

    target_email = str(target_email).strip()
    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = formataddr(("CTU Argao Support", sender_email))
    message["To"] = target_email
    message.attach(MIMEText(text, "plain", "utf-8"))
    message.attach(MIMEText(html, "html", "utf-8"))

    with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=30) as server:
        server.login(sender_email, sender_password)
        refused = server.sendmail(sender_email, [target_email], message.as_string())

    if refused:
        reason = refused.get(target_email, "SMTP server refused the recipient")
        raise RuntimeError(f"SMTP refused recipient {target_email}: {reason}")

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


def send_forgot_password_email(target_email: str, otp_code: str):
    html = f"""
    <html>
        <body style="font-family: Arial, sans-serif;">
            <div style="padding: 20px; border: 1px solid #ddd;">
                <h2>Password Reset</h2>
                <p>Use this one-time verification code to reset your password:</p>
                <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">{otp_code}</p>
                <p>This code expires in 10 minutes.</p>
            </div>
        </body>
    </html>
    """
    _send_email(
        target_email,
        "Reset Your CTU Knowledge System Password",
        html,
        f"Use this one-time verification code to reset your password: {otp_code}\nThis code expires in 10 minutes.",
    )

# --- NEW: OTP LOGIC ---
def generate_otp():
    return f"{secrets.randbelow(900000) + 100000:06d}"

def send_otp_email(target_email: str, otp_code: str):
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
    try:
        _send_email(
            target_email,
            f"Your CTU Knowledge System Verification Code: {otp_code}",
            html,
            f"Your CTU Knowledge System verification code is {otp_code}. This code expires in 10 minutes.",
        )
        print(f"[OTP] Sent verification email to {target_email}")
    except Exception as e:
        print(f"[OTP] SMTP send failed: {e}")
        raise
