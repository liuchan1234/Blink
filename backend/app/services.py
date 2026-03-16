from __future__ import annotations

import re
from datetime import datetime
from uuid import uuid4

from fastapi import status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from .core.config import settings
from .core.redis import acquire_submit_lock, get_submit_daily_count, increment_submit_daily_count, release_submit_lock
from .integrations.openai import generate_compat_report_content, generate_profile_reading
from .integrations.telegram import TELEGRAM_STARS_CURRENCY, answer_pre_checkout_query, create_compat_invoice_link, create_retest_invoice_link
from .models import CompatReport, PaymentEvent, Profile, SubmitAttempt, User
from .schemas import TelegramMessage, TelegramPreCheckoutQuery

BLINK_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
BLINK_CODE_RE = re.compile(r"^BLINK-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$")



def now_utc() -> datetime:
    return datetime.utcnow()



def normalize_lang(lang: str | None) -> str:
    code = str(lang or "").lower()
    if code.startswith("zh"):
        return "zh"
    if code.startswith("ru"):
        return "ru"
    return "en"



def resolve_user_lang(explicit_lang: str | None, telegram_language_code: str | None, fallback_lang: str | None = None) -> str:
    if explicit_lang:
        return normalize_lang(explicit_lang)
    if telegram_language_code:
        return normalize_lang(telegram_language_code)
    if fallback_lang:
        return normalize_lang(fallback_lang)
    return "en"



def normalize_blink_code(raw: str | None) -> str:
    return str(raw or "").strip().upper()



def is_valid_blink_code(code: str) -> bool:
    return bool(BLINK_CODE_RE.match(code))



def generate_blink_code(db: Session) -> str:
    rng_source = __import__("random")
    for _ in range(20000):
        suffix = "".join(rng_source.choice(BLINK_CHARS) for _ in range(6))
        code = f"BLINK-{suffix}"
        exists = db.scalar(select(Profile.profile_id).where(Profile.blink_code == code).limit(1))
        if not exists:
            return code
    raise RuntimeError("unable_to_generate_unique_code")



def get_or_create_user(db: Session, user_id: int, lang: str | None = None, ref: str | None = None) -> User:
    user = db.get(User, user_id)
    normalized_lang = normalize_lang(lang) if lang else None

    if user is None:
        user = User(user_id=user_id, lang=normalized_lang or "en", ref=ref)
        db.add(user)
        db.flush()
    else:
        if normalized_lang:
            user.lang = normalized_lang
        if ref:
            user.ref = ref
        user.updated_at = now_utc()

    return user



def get_latest_profile(db: Session, user_id: int) -> Profile | None:
    return db.scalar(
        select(Profile)
        .where(Profile.user_id == user_id)
        .order_by(Profile.created_at.desc())
        .limit(1)
    )



def record_submit_attempt(
    db: Session,
    user_id: int,
    attempt_type: str,
    status_value: str,
    reason: str | None = None,
    payment_event_id: str | None = None,
) -> SubmitAttempt:
    attempt = SubmitAttempt(
        user_id=user_id,
        attempt_type=attempt_type,
        payment_event_id=payment_event_id,
        status=status_value,
        reason=reason,
    )
    db.add(attempt)
    return attempt



def build_profile_response(profile: Profile, free_submits_used: int) -> dict:
    return {
        "blink_code": profile.blink_code,
        "mbti": profile.mbti,
        "attachment": profile.attachment,
        "poetic_name": profile.poetic_name,
        "archetype": profile.archetype,
        "one_line": profile.one_line,
        "monologue": profile.monologue,
        "description": profile.description,
        "love_letter": profile.love_letter,
        "strengths": profile.strengths_json,
        "blind_spots": profile.blind_spots_json,
        "soul_match_reason": profile.soul_match_reason,
        "eq_score": profile.eq_score,
        "profile": profile.profile_json,
        "free_submits_used": free_submits_used,
    }



def expose_profile(profile: Profile) -> dict:
    return {
        "blink_code": profile.blink_code,
        "mbti": profile.mbti,
        "attachment": profile.attachment,
        "poetic_name": profile.poetic_name,
        "archetype": profile.archetype,
        "monologue": profile.monologue,
        "eq_score": profile.eq_score,
        "profile": profile.profile_json,
    }



def init_response_payload(user: User, latest_profile: Profile | None) -> dict:
    if latest_profile is None:
        return {
            "user_id": user.user_id,
            "has_result": False,
            "blink_code": None,
            "pending_report_id": user.pending_report_id,
            "free_submits_used": user.free_submits_used,
            "lang": user.lang,
        }

    return {
        "user_id": user.user_id,
        "has_result": True,
        "blink_code": latest_profile.blink_code,
        "mbti": latest_profile.mbti,
        "attachment": latest_profile.attachment,
        "gender": latest_profile.gender,
        "zodiac": latest_profile.zodiac,
        "current_status": latest_profile.current_status,
        "lang": latest_profile.lang,
        "poetic_name": latest_profile.poetic_name,
        "archetype": latest_profile.archetype,
        "one_line": latest_profile.one_line,
        "monologue": latest_profile.monologue,
        "description": latest_profile.description,
        "love_letter": latest_profile.love_letter,
        "strengths": latest_profile.strengths_json,
        "blind_spots": latest_profile.blind_spots_json,
        "soul_match_reason": latest_profile.soul_match_reason,
        "profile": latest_profile.profile_json,
        "free_submits_used": user.free_submits_used,
        "pending_report_id": user.pending_report_id,
        "pending_code_a": user.pending_code_a,
        "pending_code_b": user.pending_code_b,
    }



def find_profile_by_code(db: Session, code: str) -> Profile | None:
    return db.scalar(select(Profile).where(Profile.blink_code == code).limit(1))



def find_available_paid_submit_event(db: Session, user_id: int) -> PaymentEvent | None:
    return db.scalar(
        select(PaymentEvent)
        .where(
            PaymentEvent.user_id == user_id,
            PaymentEvent.payload_key == f"retest:{user_id}",
            PaymentEvent.status == "success",
            PaymentEvent.consumed_at.is_(None),
        )
        .order_by(PaymentEvent.created_at.asc())
        .limit(1)
    )



def create_retest_invoice(user: User) -> dict:
    return {
        "invoice_link": create_retest_invoice_link(user.user_id),
        "amount_stars": settings.retest_price_stars,
    }



def create_compat_invoice(db: Session, user: User, code_a: str, code_b: str) -> dict:
    report = CompatReport(
        report_id=str(uuid4()),
        owner_user_id=user.user_id,
        code_a=code_a,
        code_b=code_b,
        status="pending",
        lang=user.lang,
        amount_paid=settings.compat_price_stars,
        payment_method="stars",
    )
    db.add(report)
    db.flush()

    user.pending_report_id = report.report_id
    user.pending_code_a = code_a
    user.pending_code_b = code_b
    user.updated_at = now_utc()

    try:
        invoice_link = create_compat_invoice_link(report.report_id)
        db.commit()
    except Exception:
        db.rollback()
        raise

    return {
        "invoice_link": invoice_link,
        "report_id": report.report_id,
    }



def _submit_access_result(db: Session, user: User, requested_paid_submit: bool) -> tuple[str | None, PaymentEvent | None, JSONResponse | None]:
    paid_event = find_available_paid_submit_event(db, user.user_id)

    if requested_paid_submit:
        if paid_event is not None:
            return "paid", paid_event, None
        return None, None, JSONResponse(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            content={
                "error": "payment_required",
                "require_payment": True,
                "free_submits_used": user.free_submits_used,
            },
        )

    if user.free_submits_used < settings.free_submit_limit:
        return "free", None, None

    if paid_event is not None:
        return "paid", paid_event, None

    return None, None, JSONResponse(
        status_code=status.HTTP_402_PAYMENT_REQUIRED,
        content={
            "error": "payment_required",
            "require_payment": True,
            "free_submits_used": user.free_submits_used,
        },
    )



def submit_user_quiz(
    db: Session,
    user: User,
    payload: dict,
    telegram_language_code: str | None = None,
) -> dict | JSONResponse:
    requested_paid_submit = bool(payload.get("paid_submit"))
    lock_token = acquire_submit_lock(user.user_id)
    if lock_token is None:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"error": "duplicate_submit", "detail": "submit_already_in_progress"},
        )

    try:
        submit_type, paid_event, error_response = _submit_access_result(db, user, requested_paid_submit)
        if error_response is not None:
            record_submit_attempt(db, user.user_id, "paid" if requested_paid_submit else "free", "rejected", "payment_required")
            db.commit()
            return error_response

        if submit_type == "free":
            today_count = get_submit_daily_count(user.user_id)
            if today_count >= settings.free_daily_limit:
                record_submit_attempt(db, user.user_id, "free", "rejected", "daily_limit")
                db.commit()
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={"error": "rate_limited", "detail": "daily_free_limit_exceeded"},
                )

        normalized_lang = resolve_user_lang(payload.get("lang"), telegram_language_code, user.lang)
        payload = dict(payload)
        payload["lang"] = normalized_lang
        reading = generate_profile_reading(payload)
        blink_code = generate_blink_code(db)

        profile = Profile(
            user_id=user.user_id,
            blink_code=blink_code,
            mbti=reading["mbti"],
            attachment=reading["attachment"],
            poetic_name=reading["poetic_name"],
            archetype=reading.get("archetype"),
            one_line=reading["one_line"],
            monologue=reading["monologue"],
            description=reading["description"],
            love_letter=reading["love_letter"],
            strengths_json=reading["strengths"],
            blind_spots_json=reading["blind_spots"],
            soul_match_reason=reading["soul_match_reason"],
            gender=payload.get("gender"),
            birth_year=payload.get("birth_year"),
            zodiac=payload.get("zodiac") or "aries",
            rel_history=int(payload.get("rel_history") or 0),
            current_status=payload.get("current_status") or "single",
            emotion=payload.get("emotion") or "open",
            eq_score=int(reading["eq_score"]),
            same_type_pct=float(reading["same_type_pct"]),
            depth=float(reading["depth"]),
            guard=float(reading["guard"]),
            heat=float(reading["heat"]),
            heal=float(reading["heal"]),
            read_score=float(reading["read_score"]),
            lang=normalized_lang,
            profile_json=reading["profile"],
        )
        db.add(profile)

        if submit_type == "free":
            user.free_submits_used += 1
            increment_submit_daily_count(user.user_id)
            record_submit_attempt(db, user.user_id, "free", "completed")
        else:
            if paid_event is None:
                raise RuntimeError("missing_paid_event")
            paid_event.consumed_at = now_utc()
            paid_event.status = "consumed"
            record_submit_attempt(db, user.user_id, "paid", "completed", payment_event_id=paid_event.id)

        user.lang = normalized_lang
        user.updated_at = now_utc()

        db.commit()
        db.refresh(profile)
        return build_profile_response(profile, user.free_submits_used)
    except Exception:
        db.rollback()
        raise
    finally:
        release_submit_lock(user.user_id, lock_token)



def compat_status_payload(report: CompatReport) -> dict:
    if report.status == "done":
        return {"status": "done", "report": report.report_json, "retry_count": report.retry_count}
    if report.status == "failed":
        return {"status": "failed", "retry_count": report.retry_count, "error_code": report.error_code}
    return {"status": report.status, "retry_count": report.retry_count}



def dispatch_compat_report_task(report_id: str) -> None:
    from .tasks import generate_compat_report_task

    generate_compat_report_task.delay(report_id)



def retry_compat_report(db: Session, report: CompatReport, user: User) -> dict | JSONResponse:
    if report.status != "failed":
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"error": "conflict", "detail": "report_not_failed"},
        )

    if report.retry_count >= settings.compat_retry_limit:
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"error": "retry_exhausted", "detail": "retry_count_exceeded"},
        )

    report.retry_count += 1
    report.status = "generating"
    report.report_json = None
    report.error_code = None
    report.generated_at = None
    report.updated_at = now_utc()

    user.pending_report_id = report.report_id
    user.pending_code_a = report.code_a
    user.pending_code_b = report.code_b
    user.updated_at = now_utc()

    db.commit()

    try:
        dispatch_compat_report_task(report.report_id)
    except Exception:
        report.status = "failed"
        report.error_code = "dispatch_failed"
        report.updated_at = now_utc()
        user.pending_report_id = None
        user.pending_code_a = None
        user.pending_code_b = None
        db.commit()
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": "internal_error", "detail": "dispatch_failed"},
        )

    return {"ok": True, "status": "generating", "retry_count": report.retry_count}



def list_history(db: Session, user_id: int) -> list[dict]:
    rows = db.scalars(
        select(CompatReport)
        .where(CompatReport.owner_user_id == user_id, CompatReport.status == "done")
        .order_by(
            CompatReport.generated_at.is_(None),  # MySQL: NULLs last (0 before 1)
            CompatReport.generated_at.desc(),
            CompatReport.updated_at.desc(),
        )
    ).all()

    history = []
    for row in rows:
        score = None
        if isinstance(row.report_json, dict):
            score = row.report_json.get("compat_score")
        history.append(
            {
                "report_id": row.report_id,
                "code_a": row.code_a,
                "code_b": row.code_b,
                "compat_score": score,
                "lang": row.lang,
                "generated_at": row.generated_at.isoformat() + "Z" if row.generated_at else None,
            }
        )
    return history



def _clear_pending_report(db: Session, user_id: int, report_id: str) -> None:
    owner = db.get(User, user_id)
    if owner and owner.pending_report_id == report_id:
        owner.pending_report_id = None
        owner.pending_code_a = None
        owner.pending_code_b = None
        owner.updated_at = now_utc()



def process_compat_report_generation(db: Session, report_id: str) -> dict:
    report = db.get(CompatReport, report_id)
    if report is None:
        return {"ok": False, "error": "not_found"}

    profile_a = find_profile_by_code(db, report.code_a)
    profile_b = find_profile_by_code(db, report.code_b)
    if not profile_a or not profile_b:
        report.status = "failed"
        report.error_code = "profile_not_found"
        report.updated_at = now_utc()
        _clear_pending_report(db, report.owner_user_id, report.report_id)
        db.commit()
        return {"ok": False, "status": "failed", "error": "profile_not_found"}

    try:
        report.report_json = generate_compat_report_content(
            profile_a=profile_a.profile_json,
            profile_b=profile_b.profile_json,
            code_a=report.code_a,
            code_b=report.code_b,
            mbti_a=profile_a.mbti,
            mbti_b=profile_b.mbti,
            lang=report.lang,
        )
        report.status = "done"
        report.generated_at = now_utc()
        report.error_code = None
    except Exception:
        report.status = "failed"
        report.error_code = "generation_failed"
    finally:
        report.updated_at = now_utc()
        _clear_pending_report(db, report.owner_user_id, report.report_id)
        db.commit()

    return {"ok": report.status == "done", "status": report.status, "report_id": report.report_id}



def _expected_payment_for_payload(db: Session, payload_key: str) -> tuple[int | None, int | None, str | None]:
    if payload_key.startswith("compat_report:"):
        report_id = payload_key.split(":", 1)[1]
        report = db.get(CompatReport, report_id)
        if report is None:
            return None, None, "report_not_found"
        return report.owner_user_id, settings.compat_price_stars, None

    if payload_key.startswith("retest:"):
        raw_user_id = payload_key.split(":", 1)[1]
        try:
            user_id = int(raw_user_id)
        except ValueError:
            return None, None, "invalid_payload"
        return user_id, settings.retest_price_stars, None

    return None, None, "invalid_payload"



def handle_pre_checkout_query(db: Session, query: TelegramPreCheckoutQuery) -> dict:
    expected_user_id, expected_amount, error_code = _expected_payment_for_payload(db, query.invoice_payload)
    ok = (
        error_code is None
        and query.currency == TELEGRAM_STARS_CURRENCY
        and expected_amount == query.total_amount
        and expected_user_id == query.from_user.id
    )
    error_message = None if ok else "Payment payload validation failed. Please reopen the invoice."
    answer_pre_checkout_query(query.id, ok=ok, error_message=error_message)
    return {"ok": True, "handled": "pre_checkout_query", "accepted": ok}



def process_webhook_payment(
    db: Session,
    payload_key: str,
    charge_id: str,
    user_id: int,
    amount_paid: int,
    currency: str,
) -> dict:
    existing_event = db.scalar(select(PaymentEvent).where(PaymentEvent.charge_id == charge_id).limit(1))
    if existing_event is not None:
        if (
            existing_event.payload_key != payload_key
            or existing_event.user_id != user_id
            or existing_event.amount_paid != amount_paid
            or existing_event.currency != currency
        ):
            return JSONResponse(
                status_code=status.HTTP_409_CONFLICT,
                content={"error": "conflict", "detail": "payment_replay_mismatch"},
            )

        if payload_key.startswith("compat_report:"):
            report_id = payload_key.split(":", 1)[1]
            report = db.get(CompatReport, report_id)
            if report is not None and report.status in {"pending", "failed"}:
                report.status = "generating"
                report.error_code = None
                report.updated_at = now_utc()

                owner = db.get(User, report.owner_user_id)
                if owner is not None:
                    owner.pending_report_id = report.report_id
                    owner.pending_code_a = report.code_a
                    owner.pending_code_b = report.code_b
                    owner.updated_at = now_utc()

                existing_event.status = "success"
                db.commit()

                try:
                    dispatch_compat_report_task(report_id)
                except Exception:
                    report = db.get(CompatReport, report_id)
                    if report is not None:
                        report.status = "failed"
                        report.error_code = "dispatch_failed"
                        report.updated_at = now_utc()
                    existing_event = db.get(PaymentEvent, existing_event.id)
                    if existing_event is not None:
                        existing_event.status = "dispatch_failed"
                    db.commit()
                    return {"ok": True, "idempotent": True, "dispatch": "failed"}

                return {"ok": True, "idempotent": True, "dispatch": "replayed"}

        return {"ok": True, "idempotent": True}

    expected_user_id, expected_amount, error_code = _expected_payment_for_payload(db, payload_key)
    if error_code is not None:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "invalid_params", "detail": error_code},
        )
    if expected_user_id != user_id:
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"error": "forbidden", "detail": "payment_user_mismatch"},
        )
    if expected_amount != amount_paid:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "invalid_params", "detail": "payment_amount_mismatch"},
        )
    if currency != TELEGRAM_STARS_CURRENCY:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "invalid_params", "detail": "payment_currency_mismatch"},
        )

    if payload_key.startswith("compat_report:"):
        event_type = "compat_payment"
    elif payload_key.startswith("retest:"):
        event_type = "retest_payment"
    else:
        event_type = "unknown_payment"

    event = PaymentEvent(
        user_id=user_id,
        event_type=event_type,
        payload_key=payload_key,
        charge_id=charge_id,
        amount_paid=amount_paid,
        currency=currency,
        status="success",
    )
    db.add(event)
    db.flush()

    report_id: str | None = None
    if payload_key.startswith("compat_report:"):
        report_id = payload_key.split(":", 1)[1]
        report = db.get(CompatReport, report_id)
        if report is None:
            event.status = "orphaned"
            db.commit()
            return {"ok": True, "idempotent": False, "warning": "report_not_found"}

        report.charge_id = charge_id
        report.status = "generating"
        report.updated_at = now_utc()

        owner = db.get(User, report.owner_user_id)
        if owner is not None:
            owner.pending_report_id = report.report_id
            owner.pending_code_a = report.code_a
            owner.pending_code_b = report.code_b
            owner.updated_at = now_utc()

    db.commit()

    if report_id is not None:
        try:
            dispatch_compat_report_task(report_id)
        except Exception:
            report = db.get(CompatReport, report_id)
            if report is not None:
                report.status = "failed"
                report.error_code = "dispatch_failed"
                report.updated_at = now_utc()
                _clear_pending_report(db, report.owner_user_id, report.report_id)
            event = db.get(PaymentEvent, event.id)
            if event is not None:
                event.status = "dispatch_failed"
            db.commit()
            return {"ok": True, "idempotent": False, "dispatch": "failed"}

    return {"ok": True, "idempotent": False}



def handle_successful_payment(db: Session, message: TelegramMessage) -> dict:
    payment = message.successful_payment
    if payment is None:
        return {"ok": True, "ignored": True}

    payer = message.from_user.id if message.from_user else 0
    return process_webhook_payment(
        db,
        payload_key=payment.invoice_payload,
        charge_id=payment.telegram_payment_charge_id,
        user_id=payer,
        amount_paid=payment.total_amount,
        currency=payment.currency,
    )
