"""
Create the first admin account (identity account + DB row). Nothing else is created.

    python -m app.bootstrap_admin --email owner@yourcompany.com --name "Full Name"

Prompts for a password (or pass --password).
"""
import argparse
import getpass
import sys

from app.core.database import Base, SessionLocal, engine
import app.models  # noqa: F401  (register models)
from app.core import security
from app.models.user import User, UserRole


def bootstrap_admin(email: str, name: str, password: str = None, db=None) -> User:
    own_session = db is None
    if own_session:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
    email = email.lower().strip()
    try:
        if db.query(User).filter(User.email == email).first():
            raise SystemExit(f"A user with email {email} already exists.")
        if not password or len(password) < 8:
            raise SystemExit("Password must be at least 8 characters.")
        user = User(
            email=email,
            full_name=name.strip(),
            role=UserRole.ADMIN,
            firebase_uid=security.create_auth_account(email, name),
            password_hash=security.hash_password(password),
            hourly_rate=0,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    finally:
        if own_session:
            db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--email", required=True)
    parser.add_argument("--name", required=True)
    parser.add_argument("--password", help="local auth mode only; prompted if omitted")
    args = parser.parse_args()

    pwd = args.password
    if not pwd:
        pwd = getpass.getpass("Admin password (min 8 chars): ")
        if pwd != getpass.getpass("Repeat password: "):
            sys.exit("Passwords do not match.")
    admin = bootstrap_admin(args.email, args.name, pwd)
    print(f"Admin created: {admin.email}")
