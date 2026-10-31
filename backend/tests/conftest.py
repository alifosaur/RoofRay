import os
import sys
import tempfile

# Tests must never write into the live dev database: point the app at a throwaway SQLite file
# before any app module (and its engine) is imported.
_tmp_dir = tempfile.mkdtemp(prefix="roofray_tests_")
os.environ["DATABASE_URL"] = f"sqlite:///{os.path.join(_tmp_dir, 'test.db')}"

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.load_catalog import load_catalog  # noqa: E402
from app.core import security  # noqa: E402

# Test-only: treat the bearer string as the user's UID so tests can act as any seeded test account.
# Production code has no such bypass; tests of the real local-token flow use security.issue_session_token.
_real_verify = security.verify_token


def _test_verify(token: str) -> dict:
    if token.count(".") == 2:  # a real signed session token
        return _real_verify(token)
    return {"uid": token}


security.verify_token = _test_verify
from app.core.database import SessionLocal  # noqa: E402
from app.models.user import User, UserRole  # noqa: E402

load_catalog()

# Test-only accounts; tests authenticate with "Bearer <firebase_uid>"
TEST_USERS = [
    ("admin_uid", "admin@test.local", "Test Admin", UserRole.ADMIN, "+910000000001"),
    ("sales_uid", "sales@test.local", "Test Sales", UserRole.SALES, "+910000000002"),
    ("tech_uid", "tech@test.local", "Test Technician", UserRole.TECHNICIAN, "+910000000003"),
    ("warehouse_uid", "warehouse@test.local", "Test Warehouse", UserRole.WAREHOUSE, "+910000000004"),
    ("customer_uid", "customer@roofray.com", "Test Customer", UserRole.CUSTOMER, "+91 98110 00007"),
]
_db = SessionLocal()
for uid, email, name, role, phone in TEST_USERS:
    _db.add(User(firebase_uid=uid, email=email, full_name=name, role=role, phone=phone,
                 hourly_rate=600 if role == UserRole.TECHNICIAN else 0, is_active=True))
_db.commit()
_db.close()

# Opening stock for tests, recorded the same way warehouse purchases are
from app.models.inventory import StockMovement, MovementType  # noqa: E402
from app.models.product import Product  # noqa: E402

_db = SessionLocal()
for _p in _db.query(Product).all():
    _db.add(StockMovement(product_id=_p.id, movement_type=MovementType.PURCHASE, quantity=1000,
                          unit_cost=_p.cost_price, reference="Test opening stock"))
    _p.stock_quantity = 1000
_db.commit()
_db.close()
