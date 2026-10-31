import sys
import os

# Add backend to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal, engine, Base
import app.models
from app.models.user import User, UserRole


def seed_users():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    users_data = [
        {"email": "admin@sunpower.com", "full_name": "System Administrator", "role": UserRole.ADMIN, "uid": "admin_uid", "phone": "9876543210"},
        {"email": "sales@sunpower.com", "full_name": "Rohan Sharma (Sales)", "role": UserRole.SALES, "uid": "sales_uid", "phone": "9876543211"},
        {"email": "tech@sunpower.com", "full_name": "Amit Verma (Lead Technician)", "role": UserRole.TECHNICIAN, "uid": "tech_uid", "phone": "9876543212"},
        {"email": "warehouse@sunpower.com", "full_name": "Deepak Kumar (Warehouse)", "role": UserRole.WAREHOUSE, "uid": "warehouse_uid", "phone": "9876543213"},
        {"email": "customer@sunpower.com", "full_name": "Vikram Malhotra (Customer)", "role": UserRole.CUSTOMER, "uid": "customer_uid", "phone": "9876543214"},
    ]

    for data in users_data:
        existing = db.query(User).filter((User.email == data["email"]) | (User.firebase_uid == data["uid"])).first()
        if not existing:
            user = User(
                email=data["email"],
                full_name=data["full_name"],
                role=data["role"],
                firebase_uid=data["uid"],
                phone=data["phone"],
                hourly_rate=600 if data["role"] == UserRole.TECHNICIAN else 0,
                is_active=True
            )
            db.add(user)
            print(f"Created user: {data['email']} ({data['role'].value})")
        else:
            print(f"User exists: {data['email']}")

    db.commit()
    db.close()
    print("User seeding completed.")


if __name__ == "__main__":
    seed_users()

