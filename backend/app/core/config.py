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
    # SMTP for sign-up codes and password links; with no SMTP_HOST emails are printed to the server log
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = "manvith24r@gmail.com"
    SMTP_PASSWORD: str = "yewkpqruvssycofn"
    SMTP_FROM: str = "manvith24r@gmail.com"
    SMTP_USE_TLS: bool = True
    PUBLIC_APP_URL: str = "http://localhost:5173"

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

