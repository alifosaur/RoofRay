import hashlib
import hmac
import os
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Optional, List

import jwt
import firebase_admin
from firebase_admin import auth as fb_auth, credentials
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User, UserRole

# Initialize Firebase Admin
_firebase_initialized = False

if os.path.exists(settings.FIREBASE_CREDENTIALS_PATH):
    try:
        cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
        firebase_admin.initialize_app(cred)
        _firebase_initialized = True
    except Exception as e:
        print(f"[WARN] Failed to initialize Firebase Admin with credentials: {e}")
else:
    print("[INFO] Firebase credentials file not found. Running with dev fallback.")

security_scheme = HTTPBearer(auto_error=False)


AUTH_MODE = "firebase" if _firebase_initialized else "local"
if AUTH_MODE == "local":
    print("[INFO] Auth mode: local password + signed session tokens (configure Firebase credentials for production).")

_SESSION_HOURS = 12
_RESET_HOURS = 48


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 200_000).hex()
    return f"pbkdf2_sha256$200000${salt}${digest}"


def verify_password(password: str, stored: Optional[str]) -> bool:
    if not stored:
        return False
    try:
        _, iterations, salt, digest = stored.split("$")
    except ValueError:
        return False
    candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), int(iterations)).hex()
    return hmac.compare_digest(candidate, digest)


def _issue_token(uid: str, purpose: str, hours: int) -> str:
    now = datetime.utcnow()
    return jwt.encode({"sub": uid, "purpose": purpose, "iat": now, "exp": now + timedelta(hours=hours)},
                      settings.SECRET_KEY, algorithm="HS256")


def issue_session_token(uid: str) -> str:
    return _issue_token(uid, "session", _SESSION_HOURS)


def issue_password_setup_token(uid: str) -> str:
    return _issue_token(uid, "password_setup", _RESET_HOURS)


def decode_local_token(token: str, purpose: str) -> str:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token",
                            headers={"WWW-Authenticate": "Bearer"})
    if payload.get("purpose") != purpose:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token purpose")
    return payload["sub"]


def verify_firebase_token(token: str) -> dict:
    """Verifies a Firebase ID token, or a local session token when Firebase is not configured."""
    if AUTH_MODE == "firebase":
        try:
            return fb_auth.verify_id_token(token)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid Firebase ID token: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )
    return {"uid": decode_local_token(token, "session")}


def set_account_password(user, password: str) -> None:
    """Admin-set password: Firebase account password, or the local password hash."""
    if AUTH_MODE == "firebase":
        fb_auth.update_user(user.firebase_uid, password=password)
    else:
        user.password_hash = hash_password(password)


def create_auth_account(email: str, full_name: str) -> str:
    """Creates (or reuses) the identity-provider account for a staff member and returns its UID."""
    if AUTH_MODE == "firebase":
        try:
            return fb_auth.get_user_by_email(email).uid
        except fb_auth.UserNotFoundError:
            return fb_auth.create_user(email=email, display_name=full_name).uid
    return f"local_{uuid.uuid4().hex}"


def get_current_user(
    auth_header: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not auth_header or not auth_header.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth_header.credentials
    decoded = verify_firebase_token(token)
    uid = decoded.get("uid")

    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload: missing UID",
        )

    # Check database for user
    user = db.query(User).filter(User.firebase_uid == uid).first()
    if not user and AUTH_MODE == "firebase":
        # Check by email if available in decoded token
        email = decoded.get("email")
        if email:
            user = db.query(User).filter(User.email == email).first()
            if user:
                # Update firebase_uid
                user.firebase_uid = uid
                db.commit()
                db.refresh(user)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with UID {uid} not registered in local database. Please contact an admin.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive.",
        )

    return user


def require_role(*roles: UserRole):
    """
    Dependency that enforces one or more allowed user roles.
    Admin role always has access.
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        allowed = list(roles) + [UserRole.ADMIN]
        if current_user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: action requires one of roles: {[r.value for r in roles]}. Current role: {current_user.role.value}",
            )
        return current_user

    return role_checker

