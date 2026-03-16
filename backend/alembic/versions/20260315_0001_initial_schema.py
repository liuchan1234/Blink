from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260315_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("lang", sa.String(length=5), nullable=False),
        sa.Column("ref", sa.String(length=64), nullable=True),
        sa.Column("free_submits_used", sa.Integer(), nullable=False),
        sa.Column("pending_report_id", sa.String(length=36), nullable=True),
        sa.Column("pending_code_a", sa.String(length=16), nullable=True),
        sa.Column("pending_code_b", sa.String(length=16), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("user_id"),
    )

    op.create_table(
        "profiles",
        sa.Column("profile_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("blink_code", sa.String(length=16), nullable=False),
        sa.Column("mbti", sa.String(length=4), nullable=False),
        sa.Column("attachment", sa.String(length=20), nullable=False),
        sa.Column("poetic_name", sa.String(length=64), nullable=False),
        sa.Column("archetype", sa.String(length=64), nullable=True),
        sa.Column("one_line", sa.Text(), nullable=False),
        sa.Column("monologue", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("love_letter", sa.Text(), nullable=False),
        sa.Column("strengths_json", sa.JSON(), nullable=False),
        sa.Column("blind_spots_json", sa.JSON(), nullable=False),
        sa.Column("soul_match_reason", sa.Text(), nullable=False),
        sa.Column("gender", sa.String(length=16), nullable=True),
        sa.Column("birth_year", sa.Integer(), nullable=True),
        sa.Column("zodiac", sa.String(length=20), nullable=False),
        sa.Column("rel_history", sa.Integer(), nullable=False),
        sa.Column("current_status", sa.String(length=32), nullable=False),
        sa.Column("emotion", sa.String(length=32), nullable=False),
        sa.Column("eq_score", sa.Integer(), nullable=False),
        sa.Column("same_type_pct", sa.Numeric(precision=4, scale=3, asdecimal=False), nullable=False),
        sa.Column("depth", sa.Numeric(precision=4, scale=2, asdecimal=False), nullable=False),
        sa.Column("guard", sa.Numeric(precision=4, scale=2, asdecimal=False), nullable=False),
        sa.Column("heat", sa.Numeric(precision=4, scale=2, asdecimal=False), nullable=False),
        sa.Column("heal", sa.Numeric(precision=4, scale=2, asdecimal=False), nullable=False),
        sa.Column("read_score", sa.Numeric(precision=4, scale=2, asdecimal=False), nullable=False),
        sa.Column("lang", sa.String(length=5), nullable=False),
        sa.Column("profile_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"]),
        sa.PrimaryKeyConstraint("profile_id"),
    )
    op.create_index("idx_profiles_user_created", "profiles", ["user_id", "created_at"], unique=False)
    op.create_index(op.f("ix_profiles_blink_code"), "profiles", ["blink_code"], unique=True)
    op.create_index(op.f("ix_profiles_user_id"), "profiles", ["user_id"], unique=False)

    op.create_table(
        "compat_reports",
        sa.Column("report_id", sa.String(length=36), nullable=False),
        sa.Column("owner_user_id", sa.BigInteger(), nullable=False),
        sa.Column("code_a", sa.String(length=16), nullable=False),
        sa.Column("code_b", sa.String(length=16), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("lang", sa.String(length=5), nullable=False),
        sa.Column("amount_paid", sa.Integer(), nullable=False),
        sa.Column("payment_method", sa.String(length=20), nullable=False),
        sa.Column("charge_id", sa.String(length=64), nullable=True),
        sa.Column("retry_count", sa.Integer(), nullable=False),
        sa.Column("report_json", sa.JSON(), nullable=True),
        sa.Column("error_code", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("generated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["owner_user_id"], ["users.user_id"]),
        sa.PrimaryKeyConstraint("report_id"),
    )
    op.create_index("idx_compat_owner_created", "compat_reports", ["owner_user_id", "created_at"], unique=False)
    op.create_index("idx_compat_owner_status_created", "compat_reports", ["owner_user_id", "status", "created_at"], unique=False)
    op.create_index(op.f("ix_compat_reports_owner_user_id"), "compat_reports", ["owner_user_id"], unique=False)

    op.create_table(
        "payment_events",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("event_type", sa.String(length=32), nullable=False),
        sa.Column("payload_key", sa.String(length=128), nullable=False),
        sa.Column("charge_id", sa.String(length=64), nullable=False),
        sa.Column("amount_paid", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=16), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("consumed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("charge_id"),
    )
    op.create_index("idx_payment_payload_status", "payment_events", ["payload_key", "status"], unique=False)
    op.create_index("idx_payment_user_created", "payment_events", ["user_id", "created_at"], unique=False)
    op.create_index(op.f("ix_payment_events_user_id"), "payment_events", ["user_id"], unique=False)

    op.create_table(
        "submit_attempts",
        sa.Column("attempt_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("attempt_type", sa.String(length=16), nullable=False),
        sa.Column("payment_event_id", sa.String(length=36), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("reason", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["payment_event_id"], ["payment_events.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"]),
        sa.PrimaryKeyConstraint("attempt_id"),
    )
    op.create_index("idx_submit_attempts_user_created", "submit_attempts", ["user_id", "created_at"], unique=False)
    op.create_index(op.f("ix_submit_attempts_user_id"), "submit_attempts", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_submit_attempts_user_id"), table_name="submit_attempts")
    op.drop_index("idx_submit_attempts_user_created", table_name="submit_attempts")
    op.drop_table("submit_attempts")

    op.drop_index(op.f("ix_payment_events_user_id"), table_name="payment_events")
    op.drop_index("idx_payment_user_created", table_name="payment_events")
    op.drop_index("idx_payment_payload_status", table_name="payment_events")
    op.drop_table("payment_events")

    op.drop_index(op.f("ix_compat_reports_owner_user_id"), table_name="compat_reports")
    op.drop_index("idx_compat_owner_status_created", table_name="compat_reports")
    op.drop_index("idx_compat_owner_created", table_name="compat_reports")
    op.drop_table("compat_reports")

    op.drop_index(op.f("ix_profiles_user_id"), table_name="profiles")
    op.drop_index(op.f("ix_profiles_blink_code"), table_name="profiles")
    op.drop_index("idx_profiles_user_created", table_name="profiles")
    op.drop_table("profiles")

    op.drop_table("users")
