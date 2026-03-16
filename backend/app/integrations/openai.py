from __future__ import annotations

import json
from typing import Any

import requests
from pydantic import ValidationError

from ..core.config import settings
from ..core.redis import get_gpt_daily_count, increment_gpt_daily_count
from ..mock_data import (
    build_compat_report,
    build_profile_copy_fallback,
    build_profile_payload,
    build_structured_profile,
)
from ..schemas import CompatNarrativeResult, CompatReportContent, ProfileCopyResult, ProfilePayload

OPENAI_API_BASE = "https://api.openai.com/v1"



def _openai_base_url() -> str:
    return settings.openai_base_url.rstrip("/") or OPENAI_API_BASE



def _reserve_gpt_call() -> bool:
    if get_gpt_daily_count() >= settings.gpt_daily_cap:
        return False
    return increment_gpt_daily_count() <= settings.gpt_daily_cap



def _post_chat_completion(*, model: str, system_prompt: str, user_payload: dict[str, Any]) -> dict[str, Any]:
    if not settings.openai_api_key:
        raise RuntimeError("openai_not_configured")

    response = requests.post(
        f"{_openai_base_url()}/chat/completions",
        headers={
            "Authorization": f"Bearer {settings.openai_api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": model,
            "temperature": 0.6,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(user_payload, ensure_ascii=False)},
            ],
        },
        timeout=settings.openai_timeout_sec,
    )
    response.raise_for_status()

    payload = response.json()
    choices = payload.get("choices") or []
    if not choices:
        raise RuntimeError("openai_empty_choices")

    message = choices[0].get("message") or {}
    content = message.get("content")
    if not content or not isinstance(content, str):
        raise RuntimeError("openai_empty_content")

    return json.loads(content)



def _generate_profile_copy_with_openai(structured_profile: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any] | None:
    if not _reserve_gpt_call():
        return None

    system_prompt = (
        "You write concise, emotionally intelligent relationship-reading copy for a Telegram mini app. "
        "Return JSON only. Respect the requested language exactly. Do not add markdown, headings, or extra keys. "
        "The JSON schema is: {one_line: string, monologue: string, description: string, love_letter: string, "
        "strengths: [{text: string}, {text: string}, {text: string}], blind_spots: [{text: string}, {text: string}, {text: string}], "
        "soul_match_reason: string}."
    )
    user_payload = {
        "language": structured_profile["lang"],
        "structured_profile": structured_profile,
        "quiz_context": {
            "gender": payload.get("gender"),
            "birth_year": payload.get("birth_year"),
            "zodiac": payload.get("zodiac"),
            "rel_history": payload.get("rel_history"),
            "current_status": payload.get("current_status"),
            "emotion": payload.get("emotion"),
        },
        "requirements": {
            "one_line": "8-20 words",
            "monologue": "1 sentence",
            "description": "2-3 sentences",
            "love_letter": "2-4 short lines",
            "strengths": "exactly 3 bullets",
            "blind_spots": "exactly 3 bullets",
            "soul_match_reason": "1-2 sentences",
        },
    }

    try:
        raw = _post_chat_completion(
            model=settings.openai_model_profile,
            system_prompt=system_prompt,
            user_payload=user_payload,
        )
        return ProfileCopyResult.model_validate(raw).model_dump()
    except (RuntimeError, requests.RequestException, json.JSONDecodeError, ValidationError):
        return None



def generate_profile_reading(payload: dict[str, Any]) -> dict[str, Any]:
    structured_profile = build_structured_profile(payload)
    copy = _generate_profile_copy_with_openai(structured_profile, payload)
    if copy is None:
        copy = build_profile_copy_fallback(structured_profile)

    profile_payload = ProfilePayload.model_validate(build_profile_payload(structured_profile, copy)).model_dump()
    return {
        "mbti": structured_profile["mbti"],
        "attachment": structured_profile["attachment"],
        "poetic_name": structured_profile["poetic_name"],
        "archetype": structured_profile["archetype"],
        "one_line": copy["one_line"],
        "monologue": copy["monologue"],
        "description": copy["description"],
        "love_letter": copy["love_letter"],
        "strengths": copy["strengths"],
        "blind_spots": copy["blind_spots"],
        "soul_match_reason": copy["soul_match_reason"],
        "eq_score": structured_profile["eq_score"],
        "same_type_pct": structured_profile["same_type_pct"],
        "depth": structured_profile["depth"],
        "guard": structured_profile["guard"],
        "heat": structured_profile["heat"],
        "heal": structured_profile["heal"],
        "read_score": structured_profile["read_score"],
        "profile": profile_payload,
    }



def _generate_compat_narrative_with_openai(
    *,
    profile_a: dict[str, Any],
    profile_b: dict[str, Any],
    code_a: str,
    code_b: str,
    mbti_a: str,
    mbti_b: str,
    lang: str,
    fallback_report: dict[str, Any],
) -> dict[str, Any] | None:
    if not _reserve_gpt_call():
        return None

    system_prompt = (
        "You write compatibility report narrative copy for a Telegram mini app. Return JSON only with this exact schema: "
        "{pairing_name: string, core_energy: string, growth_edges: [{trigger: string, suggestion: string}, {trigger: string, suggestion: string}, {trigger: string, suggestion: string}], "
        "love_languages: {person_a: string, person_b: string, match_note: string}, letter: string}. "
        "Keep the requested language exactly. Do not add markdown or extra keys."
    )
    user_payload = {
        "language": lang,
        "code_a": code_a,
        "code_b": code_b,
        "mbti_a": mbti_a,
        "mbti_b": mbti_b,
        "profile_a": profile_a,
        "profile_b": profile_b,
        "base_metrics": {
            "compat_score": fallback_report["compat_score"],
            "dim_emotional": fallback_report["dim_emotional"],
            "dim_communication": fallback_report["dim_communication"],
            "dim_growth": fallback_report["dim_growth"],
            "dim_intimacy": fallback_report["dim_intimacy"],
        },
        "requirements": {
            "growth_edges": "exactly 3 items",
            "letter": "2-4 sentences",
        },
    }

    try:
        raw = _post_chat_completion(
            model=settings.openai_model_compat,
            system_prompt=system_prompt,
            user_payload=user_payload,
        )
        return CompatNarrativeResult.model_validate(raw).model_dump()
    except (RuntimeError, requests.RequestException, json.JSONDecodeError, ValidationError):
        return None



def generate_compat_report_content(
    *,
    profile_a: dict[str, Any],
    profile_b: dict[str, Any],
    code_a: str,
    code_b: str,
    mbti_a: str,
    mbti_b: str,
    lang: str,
) -> dict[str, Any]:
    fallback_report = build_compat_report(profile_a, profile_b, code_a, code_b, mbti_a, mbti_b, lang=lang)
    narrative = _generate_compat_narrative_with_openai(
        profile_a=profile_a,
        profile_b=profile_b,
        code_a=code_a,
        code_b=code_b,
        mbti_a=mbti_a,
        mbti_b=mbti_b,
        lang=lang,
        fallback_report=fallback_report,
    )

    merged_report = dict(fallback_report)
    if narrative is not None:
        merged_report.update(narrative)

    return CompatReportContent.model_validate(merged_report).model_dump()
