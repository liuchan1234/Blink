from __future__ import annotations

from fastapi import Depends, FastAPI, Header, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from . import models as _models  # noqa: F401
from .core.database import bootstrap_schema_if_needed, get_db
from .core.security import get_request_auth_context, verify_telegram_webhook_secret
from .models import CompatReport
from .schemas import CompatInvoiceRequest, CompatRetryRequest, InitRequest, SubmitRequest, WebhookPayload
from .services import (
    compat_status_payload,
    create_compat_invoice,
    create_retest_invoice,
    expose_profile,
    find_profile_by_code,
    get_latest_profile,
    get_or_create_user,
    handle_pre_checkout_query,
    handle_successful_payment,
    init_response_payload,
    is_valid_blink_code,
    list_history,
    normalize_blink_code,
    resolve_user_lang,
    retry_compat_report,
    submit_user_quiz,
)

app = FastAPI(title="Blink Backend API", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    bootstrap_schema_if_needed()


@app.get("/api/health")
def health() -> dict:
    return {"ok": True}


@app.post("/api/user/init")
def user_init(payload: InitRequest, request: Request, db: Session = Depends(get_db)) -> dict:
    auth_context = get_request_auth_context(request)
    resolved_lang = resolve_user_lang(payload.lang, auth_context.language_code)
    user = get_or_create_user(db, user_id=auth_context.user_id, lang=resolved_lang, ref=payload.ref)
    latest = get_latest_profile(db, user.user_id)
    db.commit()
    return init_response_payload(user, latest)


@app.post("/api/user/submit")
def user_submit(payload: SubmitRequest, request: Request, db: Session = Depends(get_db)):
    auth_context = get_request_auth_context(request)
    resolved_lang = resolve_user_lang(payload.lang, auth_context.language_code)
    user = get_or_create_user(db, user_id=auth_context.user_id, lang=resolved_lang)
    result = submit_user_quiz(
        db,
        user,
        payload.model_dump(),
        telegram_language_code=auth_context.language_code,
    )
    return result


@app.post("/api/user/retest-invoice")
def user_retest_invoice(request: Request, db: Session = Depends(get_db)) -> dict:
    auth_context = get_request_auth_context(request)
    user = get_or_create_user(db, user_id=auth_context.user_id)
    db.commit()
    return create_retest_invoice(user)


@app.get("/api/user/lookup")
def user_lookup(code: str = Query(...), db: Session = Depends(get_db)):
    normalized = normalize_blink_code(code)
    if not is_valid_blink_code(normalized):
        return JSONResponse(status_code=400, content={"error": "invalid_code_format"})

    target = find_profile_by_code(db, normalized)
    if not target:
        return JSONResponse(status_code=404, content={"error": "not_found"})

    return expose_profile(target)


@app.get("/api/compat/history")
def compat_history(request: Request, db: Session = Depends(get_db)) -> dict:
    auth_context = get_request_auth_context(request)
    user = get_or_create_user(db, user_id=auth_context.user_id)
    db.commit()
    return {"history": list_history(db, user.user_id)}


@app.post("/api/compat/invoice")
def compat_invoice(payload: CompatInvoiceRequest, request: Request, db: Session = Depends(get_db)):
    code_a = normalize_blink_code(payload.code_a)
    code_b = normalize_blink_code(payload.code_b)

    if not is_valid_blink_code(code_a) or not is_valid_blink_code(code_b):
        return JSONResponse(status_code=400, content={"error": "invalid_code_format"})

    if code_a == code_b:
        return JSONResponse(status_code=400, content={"error": "codes_must_be_different"})

    profile_a = find_profile_by_code(db, code_a)
    profile_b = find_profile_by_code(db, code_b)
    if not profile_a or not profile_b:
        return JSONResponse(status_code=404, content={"error": "not_found"})

    auth_context = get_request_auth_context(request)
    user = get_or_create_user(db, user_id=auth_context.user_id)
    return create_compat_invoice(db, user, code_a, code_b)


@app.get("/api/compat/status/{report_id}")
def compat_status(report_id: str, request: Request, db: Session = Depends(get_db)):
    auth_context = get_request_auth_context(request)
    report = db.get(CompatReport, report_id)
    if not report:
        return JSONResponse(status_code=404, content={"error": "not_found"})
    if report.owner_user_id != auth_context.user_id:
        return JSONResponse(status_code=403, content={"error": "forbidden"})
    return compat_status_payload(report)


@app.post("/api/compat/retry")
def compat_retry(payload: CompatRetryRequest, request: Request, db: Session = Depends(get_db)):
    report = db.get(CompatReport, payload.report_id)
    if not report:
        return JSONResponse(status_code=404, content={"error": "not_found"})

    auth_context = get_request_auth_context(request)
    user = get_or_create_user(db, user_id=auth_context.user_id)
    if report.owner_user_id != user.user_id:
        return JSONResponse(status_code=403, content={"error": "forbidden"})

    return retry_compat_report(db, report, user)


@app.post("/api/webhook/telegram")
def webhook_telegram(
    payload: WebhookPayload,
    db: Session = Depends(get_db),
    x_telegram_bot_api_secret_token: str | None = Header(default=None),
):
    verify_telegram_webhook_secret(x_telegram_bot_api_secret_token)

    if payload.pre_checkout_query is not None:
        return handle_pre_checkout_query(db, payload.pre_checkout_query)

    if payload.message and payload.message.successful_payment is not None:
        return handle_successful_payment(db, payload.message)

    return {"ok": True, "ignored": True}
