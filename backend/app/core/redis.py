from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from threading import Lock
from uuid import uuid4

import redis
from redis import Redis
from redis.exceptions import RedisError

from .config import settings


@dataclass
class _MemoryValue:
    value: str
    expires_at: datetime | None = None


class _MemoryRedis:
    def __init__(self) -> None:
        self._store: dict[str, _MemoryValue] = {}
        self._lock = Lock()

    def _cleanup(self) -> None:
        now = datetime.utcnow()
        expired = [key for key, item in self._store.items() if item.expires_at and item.expires_at <= now]
        for key in expired:
            self._store.pop(key, None)

    def set(self, name: str, value: str, nx: bool = False, ex: int | None = None) -> bool:
        with self._lock:
            self._cleanup()
            if nx and name in self._store:
                return False
            expires_at = datetime.utcnow() + timedelta(seconds=ex) if ex else None
            self._store[name] = _MemoryValue(value=str(value), expires_at=expires_at)
            return True

    def get(self, name: str) -> str | None:
        with self._lock:
            self._cleanup()
            item = self._store.get(name)
            return None if item is None else item.value

    def delete(self, name: str) -> int:
        with self._lock:
            self._cleanup()
            existed = name in self._store
            self._store.pop(name, None)
            return 1 if existed else 0

    def incr(self, name: str) -> int:
        with self._lock:
            self._cleanup()
            current = int(self._store.get(name, _MemoryValue("0")).value)
            current += 1
            expires_at = self._store.get(name).expires_at if name in self._store else None
            self._store[name] = _MemoryValue(value=str(current), expires_at=expires_at)
            return current

    def expire(self, name: str, seconds: int) -> bool:
        with self._lock:
            self._cleanup()
            item = self._store.get(name)
            if item is None:
                return False
            item.expires_at = datetime.utcnow() + timedelta(seconds=seconds)
            return True


_memory_redis = _MemoryRedis()
_cached_redis: Redis | _MemoryRedis | None = None



def _day_key(day: date | None = None) -> str:
    return (day or datetime.utcnow().date()).isoformat()



def get_redis_client() -> Redis | _MemoryRedis:
    global _cached_redis
    if _cached_redis is not None:
        return _cached_redis

    try:
        client = redis.Redis.from_url(settings.redis_url, decode_responses=True)
        client.ping()
        _cached_redis = client
    except RedisError:
        _cached_redis = _memory_redis
    return _cached_redis



def build_submit_lock_key(user_id: int) -> str:
    return f"submit_lock:{user_id}"



def build_submit_daily_key(user_id: int, day: date | None = None) -> str:
    return f"submit_daily:{user_id}:{_day_key(day)}"



def build_gpt_daily_key(day: date | None = None) -> str:
    return f"gpt_daily_count:{_day_key(day)}"



def acquire_submit_lock(user_id: int, ttl_seconds: int | None = None) -> str | None:
    lock_token = str(uuid4())
    acquired = get_redis_client().set(
        build_submit_lock_key(user_id),
        lock_token,
        nx=True,
        ex=ttl_seconds or settings.submit_lock_ttl_sec,
    )
    return lock_token if acquired else None



def release_submit_lock(user_id: int, lock_token: str | None) -> None:
    if not lock_token:
        return

    client = get_redis_client()
    key = build_submit_lock_key(user_id)
    current = client.get(key)
    if current == lock_token:
        client.delete(key)



def get_submit_daily_count(user_id: int, day: date | None = None) -> int:
    raw = get_redis_client().get(build_submit_daily_key(user_id, day))
    return int(raw or 0)



def increment_submit_daily_count(user_id: int, day: date | None = None) -> int:
    key = build_submit_daily_key(user_id, day)
    client = get_redis_client()
    new_value = int(client.incr(key))
    client.expire(key, 60 * 60 * 24 * 2)
    return new_value



def get_gpt_daily_count(day: date | None = None) -> int:
    raw = get_redis_client().get(build_gpt_daily_key(day))
    return int(raw or 0)



def increment_gpt_daily_count(day: date | None = None) -> int:
    key = build_gpt_daily_key(day)
    client = get_redis_client()
    new_value = int(client.incr(key))
    client.expire(key, 60 * 60 * 24 * 2)
    return new_value
