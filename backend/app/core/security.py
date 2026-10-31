import os
from typing import Optional, List
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


def verify_firebase_token(token: str) -> dict:
    """
    Verifies Firebase ID token.
    Falls back to mock verification in dev mode if credentials file is not configured.
    """
    if _firebase_initialized:
        try:
            decoded_token = fb_auth.verify_id_token(token)
            return decoded_token
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid Firebase ID token: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )

    # Dev / Local bypass mode
    if settings.DEV_AUTH_BYPASS:
        # If token format is mock-<role>-<uid> or mock-<uid>
        if token.startswith("dev-") or token.startswith("mock-"):
            parts = token.split("-")
            uid = parts[-1]
            return {"uid": uid, "email": f"{uid}@sunpower.local"}
        # Allow standard email or uid string in dev mode
        return {"uid": token, "email": f"{token}@sunpower.local"}

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Firebase Admin SDK is not configured and dev bypass is disabled.",
    )


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
    if not user:
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

