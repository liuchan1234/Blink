from __future__ import annotations

from .core.celery_app import celery_app
from .core.database import SessionLocal
from .services import process_compat_report_generation


@celery_app.task(name="app.tasks.generate_compat_report_task", autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={"max_retries": 3})
def generate_compat_report_task(report_id: str) -> dict:
    db = SessionLocal()
    try:
        return process_compat_report_generation(db, report_id)
    finally:
        db.close()
