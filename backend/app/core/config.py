from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import List


class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    supabase_jwt_secret: str

    # Anthropic
    anthropic_api_key: str = ""

    # Intelligence Engine
    cluster_radius_meters: float = 800.0
    cluster_time_window_minutes: int = 120
    cluster_min_reports: int = 2

    # CORS — accepts comma-separated string or JSON array
    allowed_origins: List[str] = ["http://localhost:3000"]

    # App
    environment: str = "development"
    backend_url: str = "http://localhost:8000"

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        env_ignore_empty=True,
    )

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v):
        if isinstance(v, str):
            # Handle both "http://a,http://b" and '["http://a"]'
            if v.startswith("["):
                import json
                return json.loads(v)
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v


settings = Settings()
