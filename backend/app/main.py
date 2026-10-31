import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import engine, Base
import app.models  # Ensure all models are registered with Base.metadata

from app.routers import auth, users, leads, surveys, products, bom, quotes, orders, inventory, dispatch, jobs

# Create all tables on startup (works with both SQLite and PostgreSQL)
Base.metadata.create_all(bind=engine)

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


@app.get("/")
def root():
    return {
        "app": settings.PROJECT_NAME,
        "status": "online",
        "docs": "/docs",
        "env": settings.ENV,
    }


@app.get("/health")
def health():
    return {"status": "healthy"}
