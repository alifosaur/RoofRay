import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import engine, Base
import app.models  # Ensure all models are registered with Base.metadata
import app.core.events  # noqa: F401  (registers cache invalidation after commits)

from app.routers import (
    auth,
    users,
    leads,
    surveys,
    products,
    bom,
    quotes,
    orders,
    inventory,
    dispatch,
    jobs,
    tickets,
    finance,
    reports,
    customer,
    events,
    notifications,
)

from sqlalchemy import text

# Create all tables on startup (works with both SQLite and PostgreSQL)
Base.metadata.create_all(bind=engine)

# Ensure newly added columns and migrated roles exist in existing schemas
with engine.connect() as conn:
    alter_cols = [
        "ALTER TABLE customers ADD COLUMN user_id INTEGER REFERENCES users(id)",
        "ALTER TABLE leads ADD COLUMN city VARCHAR(100)",
        "ALTER TABLE leads ADD COLUMN state VARCHAR(100)",
        "ALTER TABLE leads ADD COLUMN pincode VARCHAR(20)",
        "ALTER TABLE leads ADD COLUMN property_type VARCHAR(64)",
        "ALTER TABLE leads ADD COLUMN roof_type VARCHAR(64)",
        "ALTER TABLE leads ADD COLUMN roof_area_sqft FLOAT",
        "ALTER TABLE leads ADD COLUMN shadow_free_area_sqft FLOAT",
        "ALTER TABLE leads ADD COLUMN floor_number INTEGER DEFAULT 1",
        "ALTER TABLE leads ADD COLUMN roof_direction VARCHAR(64)",
        "ALTER TABLE leads ADD COLUMN monthly_bill_amount FLOAT",
        "ALTER TABLE leads ADD COLUMN source VARCHAR(64) DEFAULT 'customer_portal'",
        "ALTER TABLE subsidy_records ADD COLUMN sanctioned_amount FLOAT DEFAULT 0.0",
        "ALTER TABLE subsidy_records ADD COLUMN rejection_notes TEXT",
        "ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)",
        "ALTER TABLE serial_items ADD COLUMN scanned_at TIMESTAMP",
        "ALTER TABLE government_schemes ADD COLUMN cfa_per_kw_first_2kw FLOAT DEFAULT 0 NOT NULL",
        "ALTER TABLE government_schemes ADD COLUMN cfa_per_kw_3rd_kw FLOAT DEFAULT 0 NOT NULL",
        "ALTER TABLE government_schemes ADD COLUMN cfa_max FLOAT DEFAULT 0 NOT NULL",
        "ALTER TABLE government_schemes ADD COLUMN state_topup_per_kw FLOAT DEFAULT 0 NOT NULL",
        "ALTER TABLE government_schemes ADD COLUMN grid_connected_only BOOLEAN DEFAULT TRUE NOT NULL",
    ]
    for stmt in alter_cols:
        try:
            conn.execute(text(stmt))
            conn.commit()
        except Exception:
            pass
    try:
        conn.execute(text("UPDATE users SET role = 'ADMIN' WHERE role IN ('SUPPORT', 'ACCOUNTS', 'support', 'accounts')"))
        conn.commit()
    except Exception:
        pass

app = FastAPI(
    title=f"{settings.PROJECT_NAME} API",
    version="1.0.0",
    description="End-to-end Rooftop Solar Installation & Operations Management ERP",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount local uploads directory
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(users.router, prefix=settings.API_V1_PREFIX)
app.include_router(leads.router, prefix=settings.API_V1_PREFIX)
app.include_router(surveys.router, prefix=settings.API_V1_PREFIX)
app.include_router(products.router, prefix=settings.API_V1_PREFIX)
app.include_router(bom.router, prefix=settings.API_V1_PREFIX)
app.include_router(quotes.router, prefix=settings.API_V1_PREFIX)
app.include_router(orders.router, prefix=settings.API_V1_PREFIX)
app.include_router(inventory.router, prefix=settings.API_V1_PREFIX)
app.include_router(dispatch.router, prefix=settings.API_V1_PREFIX)
app.include_router(jobs.router, prefix=settings.API_V1_PREFIX)
app.include_router(tickets.router, prefix=settings.API_V1_PREFIX)
app.include_router(finance.router, prefix=settings.API_V1_PREFIX)
app.include_router(reports.router, prefix=settings.API_V1_PREFIX)
app.include_router(customer.router, prefix=settings.API_V1_PREFIX)
app.include_router(events.router, prefix=settings.API_V1_PREFIX)
app.include_router(notifications.router, prefix=settings.API_V1_PREFIX)


@app.get("/")
def root():
    return {
        "app": settings.PROJECT_NAME,
        "status": "online",
        "docs": "/docs",
        "env": settings.ENV,
    }


@app.get("/health")
@app.get("/api/health")
def health():
    return {"status": "healthy"}
