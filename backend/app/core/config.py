from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / ".env", override=False)



def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or raw == "":
        return default
    try:
        return int(raw)
    except ValueError:
        return default



def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    app_env: str = os.getenv("APP_ENV", "dev").lower()
    api_port: int = _env_int("API_PORT", 8787)

    mysql_dsn: str = os.getenv("MYSQL_DSN", "")
    sqlite_dsn: str = os.getenv("SQLITE_DSN", "sqlite:///./data/app.db")
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    celery_broker_url: str = os.getenv("CELERY_BROKER_URL", os.getenv("REDIS_URL", "redis://localhost:6379/0"))
    celery_result_backend: str = os.getenv("CELERY_RESULT_BACKEND", os.getenv("REDIS_URL", "redis://localhost:6379/0"))

    db_pool_size: int = _env_int("DB_POOL_SIZE", 10)
    db_max_overflow: int = _env_int("DB_MAX_OVERFLOW", 20)
    db_pool_recycle: int = _env_int("DB_POOL_RECYCLE", 1800)
    db_pool_timeout: int = _env_int("DB_POOL_TIMEOUT", 30)

    free_submit_limit: int = _env_int("FREE_SUBMIT_LIMIT", 2)
    free_daily_limit: int = _env_int("FREE_DAILY_LIMIT", 5)
    retest_price_stars: int = _env_int("RETEST_PRICE_STARS", 25)
    compat_price_stars: int = _env_int("COMPAT_PRICE_STARS", 50)
    gpt_daily_cap: int = _env_int("GPT_DAILY_CAP", 5000)
    compat_retry_limit: int = _env_int("COMPAT_RETRY_LIMIT", 3)
    compat_timeout_sec: int = _env_int("COMPAT_TIMEOUT_SEC", 90)
    submit_lock_ttl_sec: int = _env_int("SUBMIT_LOCK_TTL_SEC", 30)

    telegram_bot_token: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    telegram_provider_token: str = os.getenv("TELEGRAM_PROVIDER_TOKEN", "")
    telegram_webhook_secret_token: str = os.getenv("TELEGRAM_WEBHOOK_SECRET_TOKEN", "")
    telegram_bot_username: str = os.getenv("TELEGRAM_BOT_USERNAME", "blink_aimatch_bot")
    telegram_api_base_url: str = os.getenv("TELEGRAM_API_BASE_URL", "https://api.telegram.org")
    telegram_init_data_max_age_sec: int = _env_int("TELEGRAM_INIT_DATA_MAX_AGE_SEC", 3600)
    telegram_init_data_required: bool = _env_bool(
        "TELEGRAM_INIT_DATA_REQUIRED", os.getenv("APP_ENV", "dev").lower() != "dev"
    )
    telegram_webhook_secret_required: bool = _env_bool(
        "TELEGRAM_WEBHOOK_SECRET_REQUIRED", os.getenv("APP_ENV", "dev").lower() != "dev"
    )

    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model_profile: str = os.getenv("OPENAI_MODEL_PROFILE", "gpt-4o-mini")
    openai_model_compat: str = os.getenv("OPENAI_MODEL_COMPAT", "gpt-4o-mini")
    openai_timeout_sec: int = _env_int("OPENAI_TIMEOUT_SEC", 30)
    openai_base_url: str = os.getenv("OPENAI_BASE_URL", "")

    celery_task_always_eager: bool = _env_bool(
        "CELERY_TASK_ALWAYS_EAGER", os.getenv("APP_ENV", "dev").lower() == "dev"
    )
    local_dev_user_id: int = _env_int("LOCAL_DEV_USER_ID", 100001)

    @property
    def is_dev(self) -> bool:
        return self.app_env == "dev"

    @property
    def database_url(self) -> str:
        mysql_dsn = self.mysql_dsn.strip()
        if mysql_dsn:
            return mysql_dsn
        if self.is_dev:
            return self.sqlite_dsn
        raise RuntimeError("MYSQL_DSN is required when APP_ENV is not dev")

    @property
    def should_bootstrap_schema(self) -> bool:
        return self.is_dev and self.database_url.startswith("sqlite")

    @property
    def should_require_integrations(self) -> bool:
        return not self.is_dev


settings = Settings()
