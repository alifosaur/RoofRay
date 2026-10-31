"""
Create the first admin account (identity account + DB row). Nothing else is created.

    python -m app.bootstrap_admin --email owner@yourcompany.com --name "Full Name"

Firebase mode: creates (or reuses) the Firebase user and prints a password-reset link to set the password.
Local mode: prompts for a password (or pass --password).
"""
import argparse
import getpass
import sys

from app.core.database import Base, SessionLocal, engine
import app.models  # noqa: F401  (register models)
from app.core import security
from app.models.user import User, UserRole


def bootstrap_admin(email: str, name: str, password: str = None) -> User:
    Base.metadata.create_all(bind=engine)
    email = email.lower().strip()
    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == email).first():
            raise SystemExit(f"A user with email {email} already exists.")
        if security.AUTH_MODE == "local" and (not password or len(password) < 8):
            raise SystemExit("Password must be at least 8 characters.")
        user = User(
            email=email,
            full_name=name.strip(),
            role=UserRole.ADMIN,
            firebase_uid=security.create_auth_account(email, name),
            password_hash=security.hash_password(password) if security.AUTH_MODE == "local" else None,
            hourly_rate=0,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--email", required=True)
    parser.add_argument("--name", required=True)
    parser.add_argument("--password", help="local auth mode only; prompted if omitted")
    args = parser.parse_args()

    pwd = args.password
    if security.AUTH_MODE == "local" and not pwd:
        pwd = getpass.getpass("Admin password (min 8 chars): ")
        if pwd != getpass.getpass("Repeat password: "):
            sys.exit("Passwords do not match.")
    admin = bootstrap_admin(args.email, args.name, pwd)
    print(f"Admin created: {admin.email} (auth mode: {security.AUTH_MODE})")
    if security.AUTH_MODE == "firebase":
        from firebase_admin import auth as fb_auth
        print("Set the password with this link:", fb_auth.generate_password_reset_link(admin.email))
