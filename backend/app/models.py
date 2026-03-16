from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from sqlalchemy import JSON, BigInteger, DateTime, ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .core.database import Base



def _utcnow() -> datetime:
    return datetime.utcnow()


class User(Base):
    __tablename__ = "users"

    user_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    lang: Mapped[str] = mapped_column(String(5), default="en", nullable=False)
    ref: Mapped[str | None] = mapped_column(String(64), nullable=True)
    free_submits_used: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    pending_report_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    pending_code_a: Mapped[str | None] = mapped_column(String(16), nullable=True)
    pending_code_b: Mapped[str | None] = mapped_column(String(16), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, onupdate=_utcnow, nullable=False)

    profiles: Mapped[list[Profile]] = relationship("Profile", back_populates="user")


class Profile(Base):
    __tablename__ = "profiles"
    __table_args__ = (
        Index("idx_profiles_user_created", "user_id", "created_at"),
    )

    profile_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.user_id"), nullable=False, index=True)

    blink_code: Mapped[str] = mapped_column(String(16), unique=True, nullable=False, index=True)
    mbti: Mapped[str] = mapped_column(String(4), nullable=False)
    attachment: Mapped[str] = mapped_column(String(20), nullable=False)
    poetic_name: Mapped[str] = mapped_column(String(64), nullable=False)
    archetype: Mapped[str | None] = mapped_column(String(64), nullable=True)

    one_line: Mapped[str] = mapped_column(Text, nullable=False)
    monologue: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    love_letter: Mapped[str] = mapped_column(Text, nullable=False)
    strengths_json: Mapped[list[dict]] = mapped_column(JSON, nullable=False)
    blind_spots_json: Mapped[list[dict]] = mapped_column(JSON, nullable=False)
    soul_match_reason: Mapped[str] = mapped_column(Text, nullable=False)

    gender: Mapped[str | None] = mapped_column(String(16), nullable=True)
    birth_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    zodiac: Mapped[str] = mapped_column(String(20), nullable=False)
    rel_history: Mapped[int] = mapped_column(Integer, nullable=False)
    current_status: Mapped[str] = mapped_column(String(32), nullable=False)
    emotion: Mapped[str] = mapped_column(String(32), nullable=False)

    eq_score: Mapped[int] = mapped_column(Integer, nullable=False)
    same_type_pct: Mapped[float] = mapped_column(Numeric(4, 3, asdecimal=False), nullable=False)
    depth: Mapped[float] = mapped_column(Numeric(4, 2, asdecimal=False), nullable=False)
    guard: Mapped[float] = mapped_column(Numeric(4, 2, asdecimal=False), nullable=False)
    heat: Mapped[float] = mapped_column(Numeric(4, 2, asdecimal=False), nullable=False)
    heal: Mapped[float] = mapped_column(Numeric(4, 2, asdecimal=False), nullable=False)
    read_score: Mapped[float] = mapped_column(Numeric(4, 2, asdecimal=False), nullable=False)
    lang: Mapped[str] = mapped_column(String(5), nullable=False)
    profile_json: Mapped[dict] = mapped_column(JSON, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, nullable=False)

    user: Mapped[User] = relationship("User", back_populates="profiles")


class CompatReport(Base):
    __tablename__ = "compat_reports"
    __table_args__ = (
        Index("idx_compat_owner_created", "owner_user_id", "created_at"),
        Index("idx_compat_owner_status_created", "owner_user_id", "status", "created_at"),
    )

    report_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    owner_user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.user_id"), nullable=False, index=True)
    code_a: Mapped[str] = mapped_column(String(16), nullable=False)
    code_b: Mapped[str] = mapped_column(String(16), nullable=False)

    status: Mapped[str] = mapped_column(String(16), nullable=False, default="pending")
    lang: Mapped[str] = mapped_column(String(5), nullable=False, default="en")

    amount_paid: Mapped[int] = mapped_column(Integer, nullable=False, default=50)
    payment_method: Mapped[str] = mapped_column(String(20), nullable=False, default="stars")
    charge_id: Mapped[str | None] = mapped_column(String(64), nullable=True)

    retry_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    report_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, onupdate=_utcnow, nullable=False)
    generated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class PaymentEvent(Base):
    __tablename__ = "payment_events"
    __table_args__ = (
        Index("idx_payment_user_created", "user_id", "created_at"),
        Index("idx_payment_payload_status", "payload_key", "status"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.user_id"), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(32), nullable=False)
    payload_key: Mapped[str] = mapped_column(String(128), nullable=False)
    charge_id: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    amount_paid: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(16), nullable=False, default="stars")
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="success")
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, nullable=False)


class SubmitAttempt(Base):
    __tablename__ = "submit_attempts"
    __table_args__ = (
        Index("idx_submit_attempts_user_created", "user_id", "created_at"),
    )

    attempt_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.user_id"), nullable=False, index=True)
    attempt_type: Mapped[str] = mapped_column(String(16), nullable=False)
    payment_event_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("payment_events.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    reason: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, nullable=False)
