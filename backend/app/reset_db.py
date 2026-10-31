"""
DEV ONLY: wipe transactional data, keep users and configuration.

    python -m app.reset_db --yes

Kept: users, customer profiles linked to a user account, products (stock reset to 0),
BOM templates and government schemes. Everything else (leads, surveys, quotes, orders, payments,
serials, jobs, tickets, invoices, subsidies, stock movements, notifications, audit log) is deleted.
"""
import argparse
import sys

from sqlalchemy import text

from app.core.config import settings
from app.core.database import Base, engine
import app.models  # noqa: F401  (register models)

KEEP = {"users", "customers", "products", "bom_templates", "bom_lines", "government_schemes", "alembic_version"}


def reset_db() -> list:
    wiped = []
    with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            if table.name not in KEEP:
                conn.execute(table.delete())
                wiped.append(table.name)
        conn.execute(text("DELETE FROM customers WHERE user_id IS NULL"))
        conn.execute(text("UPDATE products SET stock_quantity = 0"))
    return wiped


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--yes", action="store_true", help="confirm deletion of all transactional data")
    args = parser.parse_args()
    if settings.ENV == "production":
        sys.exit("Refusing to run reset_db with ENV=production.")
    if not args.yes:
        sys.exit(f"This deletes all transactional data in {settings.DATABASE_URL.split('@')[-1]}. Re-run with --yes.")
    print("Wiped:", ", ".join(reset_db()))
