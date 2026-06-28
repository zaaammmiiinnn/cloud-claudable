from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Cloud Claudable"
    DEBUG: bool = False

    # Supabase
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str
    SUPABASE_ANON_KEY: str

    # Anthropic
    ANTHROPIC_API_KEY: str

    # Docker
    DOCKER_BASE_IMAGE: str = "cloud-claudable-workspace:latest"
    CONTAINER_MEMORY_LIMIT: str = "512m"
    CONTAINER_CPU_LIMIT: float = 0.5
    CONTAINER_IDLE_TIMEOUT: int = 1800  # 30 minutes
    WORKSPACE_BASE_PATH: str = "/workspaces"

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "https://your-frontend.vercel.app"]

    # JWT
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Storage
    STORAGE_BUCKET: str = "project-files"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
