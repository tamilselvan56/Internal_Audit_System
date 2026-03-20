from pathlib import Path
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://audit_user:audit_pass_2024@localhost:5432/audit_db"
    SECRET_KEY: str = "change-this-secret-key-in-production-must-be-32-chars-min"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    GROQ_API_KEY: str = ""
    LLM_PROVIDER: str = "groq"
    LLM_MODEL: str = "llama-3.1-8b-instant"

    CHROMA_PERSIST_DIR: str = str(BASE_DIR / "chroma_db")
    UPLOAD_DIR: str = str(BASE_DIR / "uploads")
    APP_NAME: str = "Internal Audit System"
    DEBUG: bool = True
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug_value(cls, value: object) -> object:
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"release", "production", "prod"}:
                return False
            if normalized in {"debug", "development", "dev"}:
                return True
        return value

    @field_validator("CHROMA_PERSIST_DIR", "UPLOAD_DIR", mode="before")
    @classmethod
    def normalize_project_paths(cls, value: object) -> object:
        if isinstance(value, str):
            path = Path(value)
            if not path.is_absolute():
                return str((BASE_DIR / path).resolve())
        return value

    @property
    def origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]


settings = Settings()
