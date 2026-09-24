"""Temporary lockout for repeated failed sign-ins on one username (audit item 1.7).

Failed attempts are counted per username, whatever IP they come from, so a botnet
cannot guess one account's password from many addresses. The counters live in the
default cache: with Redis (REDIS_URL) they are shared by every worker and survive a
restart; without it they are per-process, which is fine for local development.
"""
import hashlib
import math
import time

from django.conf import settings
from django.core.cache import cache


def _max_failures():
    return int(getattr(settings, "LOGIN_LOCKOUT_MAX_FAILURES", 5))


def _window_seconds():
    return int(getattr(settings, "LOGIN_LOCKOUT_WINDOW_SECONDS", 900))


def _lock_seconds():
    return int(getattr(settings, "LOGIN_LOCKOUT_SECONDS", 900))


def normalize(username):
    """Same account -> same key, whatever the case or padding of what was typed."""
    if not isinstance(username, str):
        return ""
    return username.strip().lower()[:150]


def _key(kind, username):
    digest = hashlib.sha256(username.encode("utf-8")).hexdigest()[:32]
    return f"login_{kind}:{digest}"


def seconds_locked(username):
    """Seconds left on the lockout, or 0 when the username is not locked."""
    username = normalize(username)
    if not username:
        return 0
    until = cache.get(_key("lock", username))
    if until is None:
        return 0
    return max(0, math.ceil(until - time.time()))


def register_failure(username):
    """Count one failed sign-in; lock the username once the limit is reached."""
    username = normalize(username)
    if not username:
        return
    fail_key = _key("fail", username)
    cache.add(fail_key, 0, _window_seconds())      # creates the counter (with its expiry) if missing
    try:
        count = cache.incr(fail_key)               # atomic in Redis, so workers never lose a count
    except ValueError:                             # the counter expired between add() and incr()
        cache.set(fail_key, 1, _window_seconds())
        count = 1
    if count >= _max_failures():
        cache.set(_key("lock", username), time.time() + _lock_seconds(), _lock_seconds())
        cache.delete(fail_key)


def clear_failures(username):
    """A successful sign-in wipes the failure count and any active lockout."""
    username = normalize(username)
    if username:
        cache.delete(_key("fail", username))
        cache.delete(_key("lock", username))