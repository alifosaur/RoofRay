"""
One-time move of existing users into Firebase Authentication (run after adding the service-account key).

    python -m app.sync_firebase_users

For every active user: finds or creates the Firebase account with the same email, stores its UID, and prints a
password-reset link. Passwords are stored only as hashes here, so each person sets a new password via that link
(or "Forgot password?" on the login page, which makes Firebase email them).
"""
from app.core import security
from app.core.database import SessionLocal
import app.models  # noqa: F401
from app.models.user import User


def main() -> None:
    if security.AUTH_MODE != "firebase":
        raise SystemExit("Firebase is not configured: put the service-account JSON at FIREBASE_CREDENTIALS_PATH first.")
    from firebase_admin import auth as fb_auth
    db = SessionLocal()
    try:
        for user in db.query(User).filter(User.is_active == True).order_by(User.id).all():
            try:
                fb_user = fb_auth.get_user_by_email(user.email)
            except fb_auth.UserNotFoundError:
                fb_user = fb_auth.create_user(email=user.email, display_name=user.full_name)
            user.firebase_uid = fb_user.uid
            db.commit()
            print(f"{user.role.value:<10} {user.email:<35} reset link: {fb_auth.generate_password_reset_link(user.email)}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
