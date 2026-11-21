from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    google_places_api_key: str = ""
    openai_api_key: str = ""
    frontend_origin: str = "http://localhost:3000"
    database_url: str = "sqlite:///./bftm_radar.db"


settings = Settings()
