# Blink Backend (FastAPI)

This backend now targets a real integration-ready stack for Blink.MBTI:
- FastAPI + SQLAlchemy 2.x
- MySQL-first database configuration with Alembic migrations
- Redis-backed rate limiting, counters, and Celery queues
- Telegram Mini App initData verification
- Telegram Stars invoice/webhook handling with idempotency
- OpenAI-backed profile and compat generation with template fallback

Legacy Node mock code is kept in `backend/legacy_node/` for reference.

## Environment setup

1. Create a virtual environment and install dependencies:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Update `.env` for your target environment:
- `dev`: leave `MYSQL_DSN` empty to use local SQLite fallback.
- `staging` / `prod`: set `MYSQL_DSN`, `REDIS_URL`, Telegram secrets, and OpenAI credentials.
- Non-dev environments should set `TELEGRAM_INIT_DATA_REQUIRED=true` and `TELEGRAM_WEBHOOK_SECRET_REQUIRED=true`.

## Local development modes

### Minimal local mode
Uses SQLite + in-memory fallback behavior when Redis is unavailable and eager Celery execution.

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8787 --reload
```

### Full integration-like local mode
Start MySQL and Redis first, then run migrations, API, and worker.

```bash
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8787 --reload
celery -A app.core.celery_app.celery_app worker --loglevel=info
```

Recommended prerequisites for this mode:
- MySQL 8+
- Redis 7+
- Valid Telegram bot token and webhook secret
- Valid OpenAI API key

## Database behavior

- `dev` keeps a SQLite `create_all` fallback for fast local startup.
- `staging` / `prod` should rely on Alembic migrations only.
- Initial migration is in `backend/alembic/versions/20260315_0001_initial_schema.py`.

Migration commands:

```bash
alembic upgrade head
alembic downgrade -1
```

## API coverage

Implemented endpoints:
- `GET /api/health`
- `POST /api/user/init`
- `POST /api/user/submit`
- `POST /api/user/retest-invoice`
- `GET /api/user/lookup?code=BLINK-XXXXXX`
- `GET /api/compat/history`
- `POST /api/compat/invoice`
- `GET /api/compat/status/{report_id}`
- `POST /api/compat/retry`
- `POST /api/webhook/telegram`

## Runtime behavior notes

- `/api/user/submit` now uses Redis-style locking and daily free-submit counters, while `submit_attempts` remains the audit table.
- Personal profile copy is generated synchronously through OpenAI when configured, with deterministic template fallback on failure or GPT cap exhaustion.
- Compat reports are created as `pending`, switched to `generating` after payment success, and finalized by Celery tasks.
- `GET /api/compat/status/{report_id}` is now read-only and no longer auto-completes reports.
- Telegram webhook handling expects real Telegram `Update` payloads and validates `X-Telegram-Bot-Api-Secret-Token` when configured.
- Telegram Mini App auth validates `X-Telegram-Init-Data` HMAC when provided; non-dev environments should require it.

## Known dev fallbacks

To keep local iteration simple, `dev` still permits fallback behavior:
- local user fallback when Telegram initData is absent and auth enforcement is disabled
- mock invoice links when Telegram Bot credentials are not configured
- in-memory Redis substitute when Redis is unavailable
- eager Celery execution when `CELERY_TASK_ALWAYS_EAGER=true`
- template fallback when OpenAI is unavailable or returns invalid output
