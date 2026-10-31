import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "RoofRay Solutions"
    ENV: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api"

    DATABASE_URL: str = "sqlite:///./sunpower.db"
    FIREBASE_CREDENTIALS_PATH: str = "firebase-service-account.json"
    DEV_AUTH_BYPASS: bool = True

    UPLOAD_DIR: str = "./uploads"
    SECRET_KEY: str = "sunpower-secret-key-change-in-production"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

