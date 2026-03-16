from __future__ import annotations

from typing import Any

import requests
from fastapi import HTTPException, status

from ..core.config import settings

TELEGRAM_STARS_CURRENCY = "XTR"



def _telegram_api_url(method: str) -> str:
    if not settings.telegram_bot_token:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="telegram_not_configured")
    return f"{settings.telegram_api_base_url}/bot{settings.telegram_bot_token}/{method}"



def _create_invoice_link(*, title: str, description: str, payload: str, amount_stars: int) -> str:
    body: dict[str, Any] = {
        "title": title,
        "description": description,
        "payload": payload,
        "currency": TELEGRAM_STARS_CURRENCY,
        "prices": [{"label": title, "amount": amount_stars}],
    }

    if settings.telegram_provider_token:
        body["provider_token"] = settings.telegram_provider_token

    response = requests.post(_telegram_api_url("createInvoiceLink"), json=body, timeout=15)
    response.raise_for_status()
    payload_json = response.json()
    if not payload_json.get("ok") or not payload_json.get("result"):
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="telegram_invoice_failed")
    return str(payload_json["result"])



def create_retest_invoice_link(user_id: int) -> str:
    payload = f"retest:{user_id}"
    if settings.is_dev and not settings.telegram_bot_token:
        return f"https://t.me/{settings.telegram_bot_username}?start={payload}"

    return _create_invoice_link(
        title="Blink Retest",
        description="Unlock one additional submit for your current account.",
        payload=payload,
        amount_stars=settings.retest_price_stars,
    )



def create_compat_invoice_link(report_id: str) -> str:
    payload = f"compat_report:{report_id}"
    if settings.is_dev and not settings.telegram_bot_token:
        return f"https://t.me/{settings.telegram_bot_username}?start={payload}"

    return _create_invoice_link(
        title="Blink Compat Report",
        description="Generate one compatibility report for the selected BLINK pair.",
        payload=payload,
        amount_stars=settings.compat_price_stars,
    )



def build_pre_checkout_answer(query_id: str, ok: bool = True, error_message: str | None = None) -> dict[str, Any]:
    answer: dict[str, Any] = {"pre_checkout_query_id": query_id, "ok": ok}
    if error_message:
        answer["error_message"] = error_message
    return answer



def answer_pre_checkout_query(query_id: str, ok: bool = True, error_message: str | None = None) -> dict[str, Any]:
    body = build_pre_checkout_answer(query_id=query_id, ok=ok, error_message=error_message)
    if settings.is_dev and not settings.telegram_bot_token:
        return {"ok": True, "result": True, "mock": True}

    response = requests.post(_telegram_api_url("answerPreCheckoutQuery"), json=body, timeout=10)
    response.raise_for_status()
    payload_json = response.json()
    if not payload_json.get("ok"):
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="telegram_pre_checkout_failed")
    return payload_json
