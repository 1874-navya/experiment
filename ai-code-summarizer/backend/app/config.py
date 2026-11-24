from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    llm_api_key: str = ""
    llm_base_url: str = "https://api.openai.com/v1"
    llm_model: str = "gpt-4.1-mini"
    llm_timeout_seconds: int = 90

    max_upload_mb: int = 25
    max_total_upload_mb: int = 100
    max_archive_expanded_mb: int = 250
    max_files: int = 1000
    max_code_chars: int = 5_000_000
    chunk_chars: int = 12_000
    chunk_overlap_chars: int = 600

    redis_url: str = "redis://localhost:6379/0"
    shared_data_dir: Path = Path("./data")


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.shared_data_dir.mkdir(parents=True, exist_ok=True)
    return settings
