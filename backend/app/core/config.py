import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "RoofRay Solutions"
    ENV: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api"

    PORT: int = 8000
    HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    FRONTEND_PORT: int = 5173

    DATABASE_URL: str = "sqlite:///./sunpower.db"
    FIREBASE_CREDENTIALS_PATH: str = "firebase-service-account.json"
    # Firebase web config served to the frontend by /auth/config (public values)
    FIREBASE_WEB_API_KEY: str = ""
    FIREBASE_WEB_AUTH_DOMAIN: str = ""
    FIREBASE_WEB_PROJECT_ID: str = ""
    FIREBASE_WEB_APP_ID: str = ""

    UPLOAD_DIR: str = "./uploads"
    REDIS_URL: str = ""  # empty = no cache/locks (DB only)
    SECRET_KEY: str = "sunpower-secret-key-change-in-production"
    COMPANY_CONTACT_LINE: str = "Rooftop Solar Engineering & EPC"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

