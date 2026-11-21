import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    google_places_api_key: str = ""
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"
    openai_api_key: str = ""
    frontend_origin: str = "http://localhost:3000"
    # Prefer DATABASE_URL env var (Neon/Supabase Postgres); fall back to SQLite
    database_url: str = (
        os.environ.get("DATABASE_URL")
        or ("sqlite:///:memory:" if os.environ.get("VERCEL") else "sqlite:///./bftm_radar.db")
    )


settings = Settings()
