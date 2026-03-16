from __future__ import annotations

import hashlib
import random
from typing import Any

MBTI_TYPES = [
    "INTJ",
    "INTP",
    "ENTJ",
    "ENTP",
    "INFJ",
    "INFP",
    "ENFJ",
    "ENFP",
    "ISTJ",
    "ISFJ",
    "ESTJ",
    "ESFJ",
    "ISTP",
    "ISFP",
    "ESTP",
    "ESFP",
]

POETIC_NAMES = {
    "INTJ": "The Quiet Architect",
    "INTP": "The Thought Echo",
    "ENTJ": "The Horizon Captain",
    "ENTP": "The Spark Tactician",
    "INFJ": "The Moonbound Oracle",
    "INFP": "The Grounded Rose",
    "ENFJ": "The Warm Compass",
    "ENFP": "The Wild Lantern",
    "ISTJ": "The Steady Atlas",
    "ISFJ": "The Gentle Harbor",
    "ESTJ": "The Stone Standard",
    "ESFJ": "The Golden Host",
    "ISTP": "The Silent Current",
    "ISFP": "The Velvet Pulse",
    "ESTP": "The Bright Instinct",
    "ESFP": "The Festival Heart",
}

POETIC_NAMES_ZH = {
    "INTJ": "安静的建造者",
    "INTP": "思想的回响",
    "ENTJ": "地平线船长",
    "ENTP": "火花战术家",
    "INFJ": "月下预言者",
    "INFP": "扎根的玫瑰",
    "ENFJ": "温暖的指南针",
    "ENFP": "野性之灯",
    "ISTJ": "稳健的阿特拉斯",
    "ISFJ": "温柔的港湾",
    "ESTJ": "磐石标准",
    "ESFJ": "金色主人",
    "ISTP": "沉默的暗流",
    "ISFP": "天鹅绒脉搏",
    "ESTP": "明亮本能",
    "ESFP": "节日之心",
}

SOUL_MATCH_ZH = {
    "INTJ": ("ENFP", "灵感之火"),
    "INTP": ("ENTJ", "动力制造者"),
    "ENTJ": ("INFP", "温暖透镜"),
    "ENTP": ("INFJ", "安静引力"),
    "INFJ": ("ENTP", "顽皮心智"),
    "INFP": ("ENFJ", "梦想倾听者"),
    "ENFJ": ("INFP", "梦想倾听者"),
    "ENFP": ("INTJ", "北极星"),
    "ISTJ": ("ESFP", "心跳"),
    "ISFJ": ("ESTP", "脉动驱动"),
    "ESTJ": ("ISFP", "柔和野性"),
    "ESFJ": ("ISTP", "冷静之刃"),
    "ISTP": ("ESFJ", "社交太阳"),
    "ISFP": ("ESTJ", "钢铁之花"),
    "ESTP": ("ISFJ", "温柔之锚"),
    "ESFP": ("ISTJ", "沉默之石"),
}

ARCHETYPES = [
    "Navigator",
    "Alchemist",
    "Guardian",
    "Visionary",
    "Storykeeper",
    "Catalyst",
    "Composer",
    "Sentinel",
]

ATTACHMENTS = ["anxious", "secure", "avoidant"]

MONOLOGUES = {
    "en": {
        "anxious": [
            "Heart first. Logic catches up later.",
            "Reads every silence like a weather map.",
            "Soft voice, full volume feelings.",
        ],
        "secure": [
            "Steady signal. Calm in chaos.",
            "Clear words, open hands, real presence.",
            "You feel safe before you realize why.",
        ],
        "avoidant": [
            "Needs space to stay honest.",
            "Slow to open, deep once trusted.",
            "Protects peace like sacred ground.",
        ],
    },
    "ru": {
        "anxious": [
            "Сначала сердце. Логика догоняет позже.",
            "Считывает паузы как карту погоды.",
            "Тихий голос, но чувства на полной громкости.",
        ],
        "secure": [
            "Ровный сигнал. Спокойствие в хаосе.",
            "Ясные слова, открытые ладони, реальное присутствие.",
            "Рядом с тобой спокойно ещё до объяснений.",
        ],
        "avoidant": [
            "Нужно пространство, чтобы оставаться честным.",
            "Открывается медленно, но глубоко после доверия.",
            "Бережёт внутренний покой как святую территорию.",
        ],
    },
    "zh": {
        "anxious": [
            "心先行，逻辑随后跟上。",
            "把每一次沉默都当成天气图来读。",
            "声音轻柔，情绪却拉满。",
        ],
        "secure": [
            "稳定的信号，混乱中的平静。",
            "清晰的话语，敞开的双手，真实的存在。",
            "在意识到原因之前，你已感到安心。",
        ],
        "avoidant": [
            "需要空间才能保持真诚。",
            "慢热，一旦信任便深入。",
            "像守护圣地一样守护内心的平静。",
        ],
    },
}

SOUL_MATCH = {
    "INTJ": ("ENFP", "The Muse Fire"),
    "INTP": ("ENTJ", "The Momentum Maker"),
    "ENTJ": ("INFP", "The Warm Lens"),
    "ENTP": ("INFJ", "The Quiet Gravity"),
    "INFJ": ("ENTP", "The Playful Mind"),
    "INFP": ("ENFJ", "The Dream Listener"),
    "ENFJ": ("INFP", "The Dream Listener"),
    "ENFP": ("INTJ", "The North Star"),
    "ISTJ": ("ESFP", "The Heartbeat"),
    "ISFJ": ("ESTP", "The Pulse Driver"),
    "ESTJ": ("ISFP", "The Soft Wild"),
    "ESFJ": ("ISTP", "The Calm Blade"),
    "ISTP": ("ESFJ", "The Social Sun"),
    "ISFP": ("ESTJ", "The Steel Bloom"),
    "ESTP": ("ISFJ", "The Gentle Anchor"),
    "ESFP": ("ISTJ", "The Quiet Rock"),
}

LOVE_LANGUAGE_OPTIONS = {
    "en": [
        "Words of affirmation",
        "Quality time",
        "Acts of service",
        "Physical touch",
        "Gift giving",
    ],
    "ru": [
        "Слова поддержки",
        "Качественное время",
        "Помощь в делах",
        "Физический контакт",
        "Подарки",
    ],
    "zh": [
        "肯定的言语",
        "优质陪伴",
        "服务的行动",
        "身体接触",
        "礼物",
    ],
}


def _clamp(value: float, min_v: float, max_v: float) -> float:
    return max(min_v, min(max_v, value))



def _normalize_answers(answers: list[int] | None) -> float:
    if not answers:
        return 0.6
    avg = sum(int(x or 0) for x in answers) / max(len(answers), 1)
    return _clamp(avg / 5, 0.2, 1)



def _seed_from_parts(*parts: Any) -> int:
    joined = "|".join(str(part) for part in parts)
    digest = hashlib.sha256(joined.encode("utf-8")).hexdigest()
    return int(digest[:16], 16)



def _rng(*parts: Any) -> random.Random:
    return random.Random(_seed_from_parts(*parts))



def _pick_attachment(emotion: str, current_status: str, rel_history: int, seed: int) -> str:
    if current_status == "relationship":
        return "secure"
    if emotion in {"anxiety", "complicated", "melancholy"} or rel_history >= 2:
        return "anxious"
    if emotion in {"numbness", "casual"}:
        return "avoidant"
    return ATTACHMENTS[seed % len(ATTACHMENTS)]



def _localized_text(lang: str, en_text: str, ru_text: str = "", zh_text: str = "") -> str:
    if lang == "zh" and zh_text:
        return zh_text
    if lang == "ru" and ru_text:
        return ru_text
    return en_text



def build_structured_profile(payload: dict[str, Any]) -> dict[str, Any]:
    answer_signal = _normalize_answers(payload.get("quiz_answers"))
    rel_history = int(payload.get("rel_history") or 0)
    birth_year = int(payload.get("birth_year") or 2000)
    current_status = str(payload.get("current_status") or "single")
    emotion = str(payload.get("emotion") or "open")
    code = str(payload.get("lang") or "").lower()
    lang = "zh" if code.startswith("zh") else "ru" if code.startswith("ru") else "en"

    seed = _seed_from_parts(answer_signal, birth_year, rel_history, current_status, emotion, lang)
    rng = _rng(seed)

    mbti = MBTI_TYPES[seed % len(MBTI_TYPES)]
    attachment = _pick_attachment(emotion, current_status, rel_history, seed)
    poetic_name = (
        POETIC_NAMES_ZH.get(mbti, "扎根的玫瑰")
        if lang == "zh"
        else POETIC_NAMES.get(mbti, "The Grounded Rose")
    )
    archetype = ARCHETYPES[rng.randrange(len(ARCHETYPES))]
    soul_match_tuple = SOUL_MATCH_ZH.get(mbti, ("ENFJ", "梦想倾听者")) if lang == "zh" else SOUL_MATCH.get(mbti, ("ENFJ", "The Protagonist"))
    soul_match_mbti, soul_match_name = soul_match_tuple

    eq_base = 70 + round(answer_signal * 25)
    eq_score = int(_clamp(eq_base + rng.randint(-3, 4), 62, 99))
    same_type_pct = float(_clamp(round(0.08 + answer_signal * 0.13 + rng.randint(-2, 2) / 100, 3), 0.06, 0.22))

    depth = float(round(_clamp(0.45 + answer_signal * 0.45 + rng.randint(-6, 6) / 100, 0.2, 0.98), 2))
    guard = float(round(_clamp(0.4 + (1 - answer_signal) * 0.4 + rng.randint(-8, 8) / 100, 0.15, 0.95), 2))
    heat = float(round(_clamp(0.4 + answer_signal * 0.35 + rng.randint(-8, 8) / 100, 0.15, 0.96), 2))
    heal = float(round(_clamp(0.35 + answer_signal * 0.45 + rng.randint(-8, 8) / 100, 0.2, 0.95), 2))
    read_score = float(round(_clamp(0.5 + answer_signal * 0.35 + rng.randint(-6, 6) / 100, 0.2, 0.97), 2))

    return {
        "seed": seed,
        "lang": lang,
        "mbti": mbti,
        "attachment": attachment,
        "poetic_name": poetic_name,
        "archetype": archetype,
        "eq_score": eq_score,
        "same_type_pct": same_type_pct,
        "depth": depth,
        "guard": guard,
        "heat": heat,
        "heal": heal,
        "read_score": read_score,
        "soul_match_mbti": soul_match_mbti,
        "soul_match_name": soul_match_name,
    }



def build_profile_copy_fallback(structured_profile: dict[str, Any]) -> dict[str, Any]:
    lang = structured_profile["lang"]
    attachment = structured_profile["attachment"]
    mbti = structured_profile["mbti"]
    rng = _rng("profile-copy", structured_profile["seed"])

    one_line = _localized_text(
        lang,
        "Grounded empathy. Clear emotional boundaries."
        if attachment == "secure"
        else "Big heart, high sensitivity, and strong emotional radar."
        if attachment == "anxious"
        else "Reserved outside, deep and loyal inside.",
        "Устойчивая эмпатия и ясные эмоциональные границы."
        if attachment == "secure"
        else "Большое сердце, высокая чувствительность и сильный эмоциональный радар."
        if attachment == "anxious"
        else "Снаружи сдержанность, внутри глубина и верность.",
        "稳定的共情，清晰的情感边界。"
        if attachment == "secure"
        else "大心脏、高敏感、强情感雷达。"
        if attachment == "anxious"
        else "外表内敛，内心深沉而忠诚。",
    )

    description = _localized_text(
        lang,
        "You read emotional nuance quickly. When vulnerability meets clear communication, your connections become unusually deep.",
        "Ты быстро считываешь эмоциональные нюансы. Когда уязвимость встречается с ясной коммуникацией, связи становятся особенно глубокими.",
        "你快速捕捉情感细微变化。当脆弱遇上清晰沟通，你们的连接会异常深入。",
    )

    love_letter = _localized_text(
        lang,
        "Dear heart,\nYou are not too much. You are precise.\nThe right person will not fear your depth.",
        "Дорогое сердце,\nТы не слишком. Ты точное.\nПравильный человек не испугается твоей глубины.",
        "亲爱的心，\n你不是太多，你是精准。\n对的人不会畏惧你的深度。",
    )

    soul_match_reason = _localized_text(
        lang,
        f"{structured_profile['soul_match_mbti']} helps your {mbti} energy feel understood without slowing your natural rhythm.",
        f"{structured_profile['soul_match_mbti']} помогает твоей энергии {mbti} чувствовать себя понятой, не ломая твой естественный ритм.",
        f"{structured_profile['soul_match_mbti']} 让你的 {mbti} 能量被理解，同时不拖慢你的自然节奏。",
    )

    strengths = [
        {
            "text": _localized_text(
                lang,
                "Reads subtle shifts in tone before conflict escalates.",
                "Считывает тонкие изменения в тоне ещё до того, как конфликт разгорится.",
                "在冲突升级前就能察觉语气中的微妙变化。",
            )
        },
        {
            "text": _localized_text(
                lang,
                "Builds trust through consistency rather than performance.",
                "Строит доверие через устойчивость, а не через эффектность.",
                "通过一贯性而非表现来建立信任。",
            )
        },
        {
            "text": _localized_text(
                lang,
                "Can turn emotional intensity into meaningful intimacy.",
                "Умеет превращать эмоциональную интенсивность в настоящую близость.",
                "能将情感强度转化为有意义的亲密。",
            )
        },
    ]

    blind_spots = [
        {
            "text": _localized_text(
                lang,
                "May over-interpret delayed replies as emotional distance.",
                "Может воспринимать долгий ответ как эмоциональное отдаление.",
                "可能把回复延迟过度解读为情感疏离。",
            )
        },
        {
            "text": _localized_text(
                lang,
                "Can suppress needs to keep the emotional weather stable.",
                "Иногда скрывает свои потребности ради внешнего спокойствия.",
                "可能压抑需求以维持情绪稳定。",
            )
        },
        {
            "text": _localized_text(
                lang,
                "Sometimes waits too long before naming boundaries.",
                "Иногда слишком долго молчит, прежде чем обозначить границы.",
                "有时在划定边界前等待太久。",
            )
        },
    ]

    lang_monologues = MONOLOGUES.get(lang, MONOLOGUES["en"])
    monologue_options = lang_monologues.get(attachment, lang_monologues["secure"])
    monologue = monologue_options[rng.randrange(len(monologue_options))]

    return {
        "one_line": one_line,
        "monologue": monologue,
        "description": description,
        "love_letter": love_letter,
        "strengths": strengths,
        "blind_spots": blind_spots,
        "soul_match_reason": soul_match_reason,
    }



def build_profile_payload(structured_profile: dict[str, Any], copy: dict[str, Any]) -> dict[str, Any]:
    return {
        "eq_score": structured_profile["eq_score"],
        "same_type_pct": structured_profile["same_type_pct"],
        "one_line": copy["one_line"],
        "description": copy["description"],
        "soul_match_mbti": structured_profile["soul_match_mbti"],
        "soul_match_name": structured_profile["soul_match_name"],
        "soul_match_reason": copy["soul_match_reason"],
        "strengths": copy["strengths"],
        "blind_spots": copy["blind_spots"],
        "love_letter": copy["love_letter"],
        "depth": structured_profile["depth"],
        "guard": structured_profile["guard"],
        "heat": structured_profile["heat"],
        "heal": structured_profile["heal"],
        "read_score": structured_profile["read_score"],
    }



def build_user_reading(payload: dict[str, Any]) -> dict[str, Any]:
    structured_profile = build_structured_profile(payload)
    copy = build_profile_copy_fallback(structured_profile)

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
        "profile": build_profile_payload(structured_profile, copy),
    }



def build_compat_report(
    profile_a: dict[str, Any],
    profile_b: dict[str, Any],
    code_a: str,
    code_b: str,
    mbti_a: str,
    mbti_b: str,
    lang: str = "en",
) -> dict[str, Any]:
    def avg(x: float, y: float) -> float:
        return (float(x) + float(y)) / 2

    def dist(x: float, y: float) -> float:
        return abs(float(x) - float(y))

    a = profile_a or {}
    b = profile_b or {}
    rng = _rng("compat-report", code_a, code_b, mbti_a, mbti_b, lang)

    dim_emotional = int(
        _clamp(
            round(avg(a.get("depth", 0.6), b.get("depth", 0.6)) * 100 - dist(a.get("guard", 0.6), b.get("guard", 0.6)) * 14),
            55,
            98,
        )
    )
    dim_communication = int(
        _clamp(
            round(avg(a.get("read_score", 0.6), b.get("read_score", 0.6)) * 100 - dist(a.get("heat", 0.6), b.get("heat", 0.6)) * 10),
            50,
            97,
        )
    )
    dim_growth = int(
        _clamp(
            round(avg(a.get("heal", 0.6), b.get("heal", 0.6)) * 100 - dist(a.get("depth", 0.6), b.get("depth", 0.6)) * 8),
            52,
            99,
        )
    )
    dim_intimacy = int(
        _clamp(
            round(avg(a.get("heat", 0.6), b.get("heat", 0.6)) * 100 - dist(a.get("guard", 0.6), b.get("guard", 0.6)) * 12),
            50,
            98,
        )
    )
    compat_score = int(_clamp(round((dim_emotional + dim_communication + dim_growth + dim_intimacy) / 4), 50, 99))

    core_energy_options = [
        _localized_text(
            lang,
            "This connection works best when both people name their needs before tension starts writing the story for them.",
            "Эта связь лучше всего работает, когда оба называют свои потребности до того, как напряжение начинает писать сценарий за них.",
            "当双方在紧张替你们写剧本之前先说出需求，这段连接会运转得最好。",
        ),
        _localized_text(
            lang,
            "You balance emotional depth with practical momentum when pacing stays explicit.",
            "Вы сочетаете эмоциональную глубину и практический темп, когда ритм отношений проговаривается вслух.",
            "当节奏被明确表达时，你们能在情感深度与务实推进之间取得平衡。",
        ),
        _localized_text(
            lang,
            "Your pairing grows stronger when reassurance and follow-through appear together.",
            "Ваша пара становится сильнее, когда поддержка сочетается с предсказуемыми действиями.",
            "当安抚与兑现同时出现时，你们的配对会变得更稳固。",
        ),
    ]

    growth_edges = [
        {
            "trigger": _localized_text(
                lang,
                "Delayed replies are interpreted as rejection.",
                "Задержка ответа читается как отвержение.",
                "回复延迟被解读为拒绝。",
            ),
            "suggestion": _localized_text(
                lang,
                "Agree on communication windows before busy days.",
                "Договоритесь о временных окнах для связи ещё до загруженных дней.",
                "在忙碌日子到来前先约定好沟通时段。",
            ),
        },
        {
            "trigger": _localized_text(
                lang,
                "One person seeks closeness while the other needs distance.",
                "Один ищет близость, когда другому нужно расстояние.",
                "一方渴望亲近，另一方需要距离。",
            ),
            "suggestion": _localized_text(
                lang,
                "Use a reset ritual: 20 minutes alone, then reconnect intentionally.",
                "Используйте ритуал перезагрузки: 20 минут отдельно, затем осознанное возвращение в контакт.",
                "用重置仪式：独处 20 分钟，然后有意地重新连接。",
            ),
        },
        {
            "trigger": _localized_text(
                lang,
                "Conflict loops around tone instead of topic.",
                "Конфликт застревает на тоне разговора, а не на сути вопроса.",
                "冲突围绕语气而非内容打转。",
            ),
            "suggestion": _localized_text(
                lang,
                "Name one concrete request each before discussing emotions.",
                "Сначала назовите по одной конкретной просьбе, и только потом обсуждайте эмоции.",
                "先说出一个具体请求，再讨论情绪。",
            ),
        },
    ]

    love_opts = LOVE_LANGUAGE_OPTIONS.get(lang, LOVE_LANGUAGE_OPTIONS["en"])
    person_a_language = love_opts[rng.randrange(len(love_opts))]
    person_b_language = love_opts[rng.randrange(len(love_opts))]

    letter_intro = _localized_text(
        lang,
        "Let conflict become information, not proof of incompatibility.",
        "Пусть конфликт станет информацией, а не доказательством несовместимости.",
        "让冲突成为信息，而非不兼容的证明。",
    )
    letter_closer = _localized_text(
        lang,
        "Choose clarity over guessing, and this bond becomes durable.",
        "Выбирайте ясность вместо догадок — и эта связь станет прочной.",
        "选择清晰而非猜测，这段联结才会持久。",
    )

    return {
        "generated_at": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        "code_a": code_a,
        "code_b": code_b,
        "compat_score": compat_score,
        "pairing_name": (
            f"{mbti_a} × {mbti_b} 共鸣"
            if lang == "zh"
            else f"{mbti_a} × {mbti_b} Резонанс"
            if lang == "ru"
            else f"{mbti_a} × {mbti_b} Resonance"
        ),
        "dim_emotional": dim_emotional,
        "dim_communication": dim_communication,
        "dim_growth": dim_growth,
        "dim_intimacy": dim_intimacy,
        "core_energy": core_energy_options[rng.randrange(len(core_energy_options))],
        "growth_edges": growth_edges,
        "love_languages": {
            "person_a": person_a_language,
            "person_b": person_b_language,
            "match_note": _localized_text(
                lang,
                "Compatibility rises when appreciation style is translated, not assumed.",
                "Совместимость растёт, когда язык любви переводят друг для друга, а не угадывают.",
                "当爱的语言被翻译而非臆测时，兼容性会提升。",
            ),
        },
        "letter": f"{letter_intro}\n{letter_closer}",
    }
