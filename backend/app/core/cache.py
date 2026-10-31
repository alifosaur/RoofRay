"""
Redis cache + locks. Optional: with no REDIS_URL (or Redis down) every call goes straight to the DB,
so the cache can only ever return data that a real query produced.
"""
import json
import uuid
from contextlib import contextmanager
from typing import Any, Callable, Optional

from fastapi import HTTPException

from app.core.config import settings

_client = None
_disabled = not settings.REDIS_URL


def _redis():
    global _client, _disabled
    if _disabled:
        return None
    if _client is None:
        try:
            import redis
            _client = redis.Redis.from_url(settings.REDIS_URL, socket_timeout=0.5, socket_connect_timeout=0.5)
            _client.ping()
        except Exception as e:
            print(f"[WARN] Redis unavailable ({e}); running without cache and locks.")
            _disabled = True
            return None
    return _client


def cached(key: str, ttl_seconds: int, compute: Callable[[], Any]) -> Any:
    r = _redis()
    if r is not None:
        try:
            hit = r.get(key)
            if hit is not None:
                return json.loads(hit)
        except Exception:
            pass
    value = compute()
    if r is not None:
        try:
            r.setex(key, ttl_seconds, json.dumps(value, default=str))
        except Exception:
            pass
    return value


def invalidate(prefix: str = "dash:") -> None:
    r = _redis()
    if r is None:
        return
    try:
        keys = list(r.scan_iter(f"{prefix}*"))
        if keys:
            r.delete(*keys)
    except Exception:
        pass


@contextmanager
def lock(name: str, ttl_ms: int = 10_000):
    """Short exclusive lock (e.g. per serial number). The DB unique constraint remains the final guard."""
    r = _redis()
    if r is None:
        yield
        return
    token = uuid.uuid4().hex
    if not r.set(f"lock:{name}", token, nx=True, px=ttl_ms):
        raise HTTPException(status_code=409, detail="This item is being processed by someone else. Try again.")
    try:
        yield
    finally:
        try:
            if r.get(f"lock:{name}") == token.encode():
                r.delete(f"lock:{name}")
        except Exception:
            pass
