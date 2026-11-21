import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    google_places_api_key: str = ""
    openai_api_key: str = ""
    frontend_origin: str = "http://localhost:3000"
    # Use in-memory SQLite on Vercel (ephemeral); file-based locally for dev
    database_url: str = "sqlite:///:memory:" if os.environ.get("VERCEL") else "sqlite:///./bftm_radar.db"


settings = Settings()
