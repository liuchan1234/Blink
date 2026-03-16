from __future__ import annotations

from celery import Celery

from .config import settings

celery_app = Celery(
    "blink_backend",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

celery_app.conf.update(
    task_always_eager=settings.celery_task_always_eager,
    task_eager_propagates=True,
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_time_limit=settings.compat_timeout_sec,
    task_soft_time_limit=settings.compat_timeout_sec,
    timezone="UTC",
    enable_utc=True,
)

celery_app.autodiscover_tasks(["app"])
