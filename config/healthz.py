from django.db import connection
from django.http import JsonResponse
from django.views.decorators.http import require_GET
import time


@require_GET
def healthz(request):
    """
    GET /healthz  — liveness + readiness probe.
    Returns 200 with build info when the database is reachable,
    503 when it is not. Safe to call without authentication.
    """
    start = time.monotonic()
    db_ok = False
    db_error = ""
    try:
        connection.ensure_connection()
        db_ok = True
    except Exception as exc:
        db_error = str(exc)

    latency_ms = round((time.monotonic() - start) * 1000, 1)
    payload = {
        "status": "ok" if db_ok else "degraded",
        "db": "ok" if db_ok else f"error: {db_error}",
        "db_latency_ms": latency_ms,
    }
    return JsonResponse(payload, status=200 if db_ok else 503)
