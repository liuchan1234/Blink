from __future__ import annotations

import hashlib
import hmac
import json
from dataclasses import dataclass
from time import time
from urllib.parse import parse_qsl

from fastapi import HTTPException, Request, status

from .config import settings


@dataclass(frozen=True)
class TelegramAuthContext:
    user_id: int
    language_code: str | None = None
    auth_date: int | None = None
    raw_init_data: str | None = None



def _secret_key(bot_token: str) -> bytes:
    return hmac.new(b"WebAppData", bot_token.encode("utf-8"), hashlib.sha256).digest()



def _build_data_check_string(init_data_raw: str) -> tuple[str, dict[str, str]]:
    pairs = parse_qsl(init_data_raw, keep_blank_values=True, strict_parsing=False)
    values = {key: value for key, value in pairs}
    check_pairs = [f"{key}={value}" for key, value in sorted(values.items()) if key != "hash"]
    return "\n".join(check_pairs), values



def validate_telegram_init_data(init_data_raw: str) -> TelegramAuthContext:
    if not init_data_raw:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing_init_data")
    if not settings.telegram_bot_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="telegram_auth_not_configured")

    data_check_string, values = _build_data_check_string(init_data_raw)
    received_hash = values.get("hash")
    if not received_hash:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing_init_hash")

    expected_hash = hmac.new(
        _secret_key(settings.telegram_bot_token),
        data_check_string.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected_hash, received_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_init_hash")

    auth_date_raw = values.get("auth_date")
    if not auth_date_raw:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing_auth_date")

    try:
        auth_date = int(auth_date_raw)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_auth_date") from exc

    max_age = settings.telegram_init_data_max_age_sec
    if max_age > 0 and int(time()) - auth_date > max_age:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="expired_init_data")

    user_raw = values.get("user")
    if not user_raw:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing_user")

    try:
        user_obj = json.loads(user_raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_user_payload") from exc

    user_id = user_obj.get("id")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing_user_id")

    try:
        parsed_user_id = int(user_id)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_user_id") from exc

    return TelegramAuthContext(
        user_id=parsed_user_id,
        language_code=user_obj.get("language_code"),
        auth_date=auth_date,
        raw_init_data=init_data_raw,
    )



def get_request_auth_context(request: Request) -> TelegramAuthContext:
    cached = getattr(request.state, "telegram_auth_context", None)
    if cached is not None:
        return cached

    init_data = request.headers.get("x-telegram-init-data")
    if init_data:
        context = validate_telegram_init_data(init_data)
        request.state.telegram_auth_context = context
        return context

    if settings.telegram_init_data_required and not settings.is_dev:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing_init_data")

    context = TelegramAuthContext(user_id=settings.local_dev_user_id, language_code="en", raw_init_data=init_data)
    request.state.telegram_auth_context = context
    return context



def get_request_user_id(request: Request) -> int:
    return get_request_auth_context(request).user_id



def get_request_language_code(request: Request) -> str | None:
    return get_request_auth_context(request).language_code



def verify_telegram_webhook_secret(secret_header: str | None) -> None:
    configured = settings.telegram_webhook_secret_token.strip()
    if not configured:
        if settings.telegram_webhook_secret_required and not settings.is_dev:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="webhook_secret_not_configured")
        return

    if not secret_header or not hmac.compare_digest(secret_header, configured):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_webhook_secret")
