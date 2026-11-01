"""
Seed 15 professional field technicians with authentic Indian names.
No dummy 'test' or variable names. All marked active and free.
"""
from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.core import security

TECHNICIANS = [
    {"full_name": "Rohan Verma", "email": "rohan.verma@roofray.in", "phone": "9820112233", "rate": 650},
    {"full_name": "Amit Kulkarni", "email": "amit.kulkarni@roofray.in", "phone": "9820112234", "rate": 600},
    {"full_name": "Suresh Nair", "email": "suresh.nair@roofray.in", "phone": "9820112235", "rate": 700},
    {"full_name": "Vikram Rathore", "email": "vikram.rathore@roofray.in", "phone": "9820112236", "rate": 650},
    {"full_name": "Arjun Reddy", "email": "arjun.reddy@roofray.in", "phone": "9820112237", "rate": 620},
    {"full_name": "Deepak Joshi", "email": "deepak.joshi@roofray.in", "phone": "9820112238", "rate": 580},
    {"full_name": "Rahul Deshmukh", "email": "rahul.deshmukh@roofray.in", "phone": "9820112239", "rate": 640},
    {"full_name": "Manoj Tiwari", "email": "manoj.tiwari@roofray.in", "phone": "9820112240", "rate": 600},
    {"full_name": "Anand Iyer", "email": "anand.iyer@roofray.in", "phone": "9820112241", "rate": 680},
    {"full_name": "Rajesh Kumar", "email": "rajesh.kumar@roofray.in", "phone": "9820112242", "rate": 650},
    {"full_name": "Kiran Patel", "email": "kiran.patel@roofray.in", "phone": "9820112243", "rate": 620},
    {"full_name": "Gaurav Sen", "email": "gaurav.sen@roofray.in", "phone": "9820112244", "rate": 600},
    {"full_name": "Nitin Sharma", "email": "nitin.sharma@roofray.in", "phone": "9820112245", "rate": 650},
    {"full_name": "Pradeep Pillai", "email": "pradeep.pillai@roofray.in", "phone": "9820112246", "rate": 630},
    {"full_name": "Sandeep Chawla", "email": "sandeep.chawla@roofray.in", "phone": "9820112247", "rate": 670},
]


def seed_technicians():
    db = SessionLocal()
    default_pwd_hash = security.hash_password("password123")

    # If ID 10 exists (previously named 'beja'), update to first tech (Rohan Verma)
    tech10 = db.query(User).filter(User.id == 10).first()
    if tech10:
        first = TECHNICIANS[0]
        tech10.full_name = first["full_name"]
        tech10.email = first["email"]
        tech10.phone = first["phone"]
        tech10.hourly_rate = first["rate"]
        tech10.is_active = True
        tech10.password_hash = default_pwd_hash
        db.commit()
        print(f"Updated technician #10 to {first['full_name']} ({first['email']})")

    # Seed or update all 15 technicians
    count = 0
    for tech_data in TECHNICIANS:
        existing = db.query(User).filter(User.email == tech_data["email"]).first()
        if existing:
            existing.full_name = tech_data["full_name"]
            existing.phone = tech_data["phone"]
            existing.hourly_rate = tech_data["rate"]
            existing.role = UserRole.TECHNICIAN
            existing.is_active = True
            existing.password_hash = default_pwd_hash
            count += 1
        else:
            new_tech = User(
                firebase_uid=f"local_tech_{tech_data['phone']}",
                email=tech_data["email"],
                full_name=tech_data["full_name"],
                role=UserRole.TECHNICIAN,
                phone=tech_data["phone"],
                hourly_rate=tech_data["rate"],
                is_active=True,
                password_hash=default_pwd_hash,
            )
            db.add(new_tech)
            count += 1

    db.commit()

    all_active_techs = db.query(User).filter(User.role == UserRole.TECHNICIAN, User.is_active == True).all()
    print(f"Total active certified technicians in database: {len(all_active_techs)}")
    for t in all_active_techs:
        print(f"  • ID {t.id}: {t.full_name} | {t.email} | {t.phone} | ₹{t.hourly_rate}/hr")
    db.close()


if __name__ == "__main__":
    seed_technicians()

