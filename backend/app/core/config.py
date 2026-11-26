from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "LAW PAN Restaurant POS & Management System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = "lawpan_super_secret_local_key_change_in_production_2026_chinese_restaurant"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours for daily local restaurant shift
    
    # Database
    DATABASE_URL: str = f"sqlite:///{BASE_DIR}/data/lawpan.db"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:80",
        "http://localhost",
        "http://127.0.0.1",
        "tauri://localhost",
        "http://tauri.localhost",
        "*"
    ]
    
    # File storage paths
    DATA_DIR: Path = BASE_DIR / "data"
    BACKUP_DIR: Path = BASE_DIR / "data" / "backups"
    UPLOAD_DIR: Path = BASE_DIR / "data" / "uploads"
    
    # Currency
    CURRENCY_CODE: str = "MMK"
    CURRENCY_SYMBOL: str = "Ks"
    
    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", extra="ignore")


settings = Settings()

# Ensure directories exist
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
settings.BACKUP_DIR.mkdir(parents=True, exist_ok=True)
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
