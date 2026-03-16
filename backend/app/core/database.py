from __future__ import annotations

from pathlib import Path
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import settings


class Base(DeclarativeBase):
    pass



def _is_sqlite(url: str) -> bool:
    return url.startswith("sqlite")



def _ensure_sqlite_dir(url: str) -> None:
    if not _is_sqlite(url):
        return

    db_path = url.replace("sqlite:///", "", 1)
    path = Path(db_path).resolve()
    path.parent.mkdir(parents=True, exist_ok=True)



def create_db_engine(database_url: str | None = None) -> Engine:
    url = database_url or settings.database_url
    _ensure_sqlite_dir(url)

    engine_kwargs: dict = {
        "future": True,
        "pool_pre_ping": True,
    }

    if _is_sqlite(url):
        engine_kwargs["connect_args"] = {"check_same_thread": False}
    else:
        engine_kwargs.update(
            {
                "pool_size": settings.db_pool_size,
                "max_overflow": settings.db_max_overflow,
                "pool_recycle": settings.db_pool_recycle,
                "pool_timeout": settings.db_pool_timeout,
            }
        )

    return create_engine(url, **engine_kwargs)


engine = create_db_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)



def bootstrap_schema_if_needed() -> None:
    if settings.should_bootstrap_schema:
        Base.metadata.create_all(bind=engine)



def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
