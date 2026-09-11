from typing import List, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )

    # Application
    APP_NAME: str = "VoiceGuard-AI"
    APP_ENV: str = "development"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEPLOYMENT_MODE: str = "development"  # development, staging, production

    # Security
    SECRET_KEY: str = Field(
        default="09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database
    DATABASE_URL: str = "sqlite:///./voiceguard.db"

    # CORS
    CORS_ORIGINS: Union[str, List[str]] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    # Audio Ingestion & Processing
    AUDIO_SAMPLE_RATE: int = 16000
    MAX_AUDIO_SIZE_BYTES: int = 52428800  # 50 MB
    MAX_AUDIO_DURATION_SECONDS: int = 600  # 10 minutes
    STREAM_WINDOW_SIZE_SECONDS: float = 2.5
    STREAM_STEP_SIZE_SECONDS: float = 0.5

    # Machine Learning Models
    ANTI_SPOOF_MODEL_PATH: str = "backend/app/services/ml/anti_spoof/checkpoints/AASIST.pth"
    SPEAKER_VERIFICATION_MODEL_PATH: str = ""
    DEVICE: str = "auto"  # cpu, cuda, auto

    # Risk Thresholds
    RISK_THRESHOLD_LOW: float = 30.0
    RISK_THRESHOLD_MEDIUM: float = 60.0
    RISK_THRESHOLD_HIGH: float = 80.0

    # Risk Fusion Weights (Configurable prototype weights; Sum must equal 1.0)
    WEIGHT_SPOOF: float = 0.40
    WEIGHT_SPEAKER_MISMATCH: float = 0.25
    WEIGHT_CALLER_CONTEXT: float = 0.15
    WEIGHT_TRANSACTION_SENSITIVITY: float = 0.10
    WEIGHT_BEHAVIORAL: float = 0.10

    # Audit Ledger
    AUDIT_LEDGER_ENABLED: bool = True
    GENESIS_BLOCK_HASH: str = "0" * 64

    # Retention Policies
    AUDIO_RETENTION_DAYS: int = 0  # 0 = do not store raw audio on disk
    AUDIT_RETENTION_DAYS: int = 365
    LOG_LEVEL: str = "INFO"


settings = Settings()
