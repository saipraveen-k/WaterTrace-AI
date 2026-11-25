from pydantic_settings import BaseSettings
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

    # CORS
    allowed_origins: List[str] = ["http://localhost:3000"]

    # App
    environment: str = "development"
    backend_url: str = "http://localhost:8000"

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
