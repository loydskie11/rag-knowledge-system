import os
from typing import Optional
from fastapi import Request, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from supabase import create_client, Client
from dotenv import load_dotenv

import models
import schemas
import utils
from database import get_db

load_dotenv()

# Supabase Client Initialization
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
supabase: Optional[Client] = None

if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"[Supabase Init Warning]: {e}")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login", auto_error=False)

def extract_token_from_request(request: Request, bearer_token: Optional[str] = None) -> Optional[str]:
    """Helper to extract token from Bearer header OR HttpOnly cookie."""
    if bearer_token and bearer_token.strip() not in ("null", "undefined", ""):
        return bearer_token.strip()
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        parts = auth_header.split(" ")
        if len(parts) > 1:
            token_val = parts[1].strip()
            if token_val and token_val not in ("null", "undefined", ""):
                return token_val
    cookie_token = request.cookies.get("access_token")
    if cookie_token:
        cookie_clean = cookie_token.replace("Bearer ", "").strip()
        if cookie_clean and cookie_clean not in ("null", "undefined", ""):
            return cookie_clean
    return None

def get_current_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> models.User:
    """Verifies incoming JWT access token from Header or HttpOnly Cookie."""
    extracted_token = extract_token_from_request(request, token)
    if not extracted_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Missing Bearer access token or auth cookie.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = utils.decode_access_token(extracted_token)
        email: str = payload.get("sub")
        if not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token claims.",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token has expired or is invalid.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account not found.")

    if user.status != "Active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is disabled.")

    return user

def get_optional_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Optional[models.User]:
    """Optional user resolution supporting both Header and Cookie auth."""
    extracted_token = extract_token_from_request(request, token)
    if not extracted_token:
        return None
    try:
        payload = utils.decode_access_token(extracted_token)
        email = payload.get("sub")
        if email:
            return db.query(models.User).filter(models.User.email == email).first()
    except Exception:
        pass
    return None

def get_current_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    """Enforces Admin role requirement for administrative routes."""
    if current_user.role.upper() != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted. Administrator privileges required."
        )
    return current_user

def get_current_faculty_or_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    """Enforces Faculty or Admin role requirement."""
    if current_user.role.upper() not in ["FACULTY", "ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to Faculty and Administrator roles."
        )
    return current_user
