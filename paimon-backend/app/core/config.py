"""
Application configuration management using pydantic-settings.

Loads configuration from environment variables with sensible defaults.
"""

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable loading."""

    # API Configuration
    API_V1_PREFIX: str = "/api"
    PROJECT_NAME: str = "Paimon DEX Backend API"
    VERSION: str = "0.1.0"
    DESCRIPTION: str = "Backend API for Paimon DEX - RWA veDEX Protocol"

    # CORS Configuration
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:4000",
        "https://paimon.dex",
    ]

    # Database Configuration
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/paimon",
        description="PostgreSQL database URL (Supabase)",
    )

    # Redis Configuration
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        description="Redis URL (Upstash)",
    )

    # JWT Configuration
    JWT_SECRET: str = Field(
        default="change-this-secret-key-in-production",
        description="Secret key for JWT token signing",
    )
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Blockchain Configuration
    BSC_RPC_URL: str = Field(
        default="https://data-seed-prebsc-1-s1.binance.org:8545",
        description="BSC Testnet RPC URL",
    )
    CHAIN_ID: int = 97  # BSC Testnet

    # Third-party Services
    BLOCKPASS_CLIENT_ID: str | None = None
    BLOCKPASS_SECRET: str | None = None
    TASKON_API_KEY: str | None = None
    REOWN_PROJECT_ID: str | None = None

    # Environment
    ENVIRONMENT: str = Field(default="development", description="Environment name")
    DEBUG: bool = Field(default=True, description="Debug mode")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    @field_validator("ENVIRONMENT")
    @classmethod
    def validate_environment(cls, v: str) -> str:
        """Validate environment is one of: development, staging, production."""
        allowed = ["development", "staging", "production"]
        if v not in allowed:
            raise ValueError(f"ENVIRONMENT must be one of {allowed}")
        return v

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v):
        """Parse ALLOWED_ORIGINS from comma-separated string or list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v


# Global settings instance
settings = Settings()
