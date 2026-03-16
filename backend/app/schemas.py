from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class InitRequest(BaseModel):
    ref: str | None = None
    lang: str | None = None


class SubmitRequest(BaseModel):
    gender: str | None = None
    birth_year: int | None = None
    zodiac: str = "aries"
    rel_history: int = 0
    current_status: str = "single"
    emotion: str = "open"
    quiz_answers: list[int] = Field(default_factory=list)
    lang: str | None = None
    paid_submit: bool = False


class CompatInvoiceRequest(BaseModel):
    code_a: str
    code_b: str


class CompatRetryRequest(BaseModel):
    report_id: str


class TextBullet(BaseModel):
    text: str


class ProfileCopyResult(BaseModel):
    one_line: str
    monologue: str
    description: str
    love_letter: str
    strengths: list[TextBullet] = Field(min_length=3)
    blind_spots: list[TextBullet] = Field(min_length=3)
    soul_match_reason: str


class ProfilePayload(BaseModel):
    eq_score: int
    same_type_pct: float
    one_line: str
    description: str
    soul_match_mbti: str
    soul_match_name: str
    soul_match_reason: str
    strengths: list[TextBullet] = Field(min_length=3)
    blind_spots: list[TextBullet] = Field(min_length=3)
    love_letter: str
    depth: float
    guard: float
    heat: float
    heal: float
    read_score: float


class CompatGrowthEdge(BaseModel):
    trigger: str
    suggestion: str


class CompatLoveLanguages(BaseModel):
    person_a: str
    person_b: str
    match_note: str


class CompatNarrativeResult(BaseModel):
    pairing_name: str
    core_energy: str
    growth_edges: list[CompatGrowthEdge] = Field(min_length=3)
    love_languages: CompatLoveLanguages
    letter: str


class CompatReportContent(BaseModel):
    generated_at: str
    code_a: str
    code_b: str
    compat_score: int
    pairing_name: str
    dim_emotional: int
    dim_communication: int
    dim_growth: int
    dim_intimacy: int
    core_energy: str
    growth_edges: list[CompatGrowthEdge] = Field(min_length=3)
    love_languages: CompatLoveLanguages
    letter: str


class TelegramUser(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: int
    language_code: str | None = None


class TelegramSuccessfulPayment(BaseModel):
    model_config = ConfigDict(extra="ignore")

    currency: str
    total_amount: int
    invoice_payload: str
    telegram_payment_charge_id: str
    provider_payment_charge_id: str | None = None


class TelegramMessage(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    message_id: int | None = None
    from_user: TelegramUser | None = Field(default=None, alias="from")
    successful_payment: TelegramSuccessfulPayment | None = None


class TelegramPreCheckoutQuery(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    id: str
    from_user: TelegramUser = Field(alias="from")
    currency: str
    total_amount: int
    invoice_payload: str


class WebhookPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    update_id: int | None = None
    pre_checkout_query: TelegramPreCheckoutQuery | None = None
    message: TelegramMessage | None = None
