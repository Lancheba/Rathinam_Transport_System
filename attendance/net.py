"""Single place that decides which IP address a request came from."""
import ipaddress

from rest_framework.throttling import BaseThrottle


def _valid_ip(value):
    try:
        return str(ipaddress.ip_address((value or "").strip()))
    except ValueError:
        return None


def client_ip(request):
    """Return the client IP as a valid address string, or None.

    Uses the same NUM_PROXIES rule as DRF throttling, so the audit trail and
    the rate limiter agree. A spoofed or garbage header can never return a
    non-IP string: we fall back to REMOTE_ADDR, then to None.
    """
    ip = _valid_ip(BaseThrottle().get_ident(request))
    if ip:
        return ip
    return _valid_ip(request.META.get("REMOTE_ADDR"))

def user_agent(request):
    """The browser/app identifier, trimmed to the audit column size."""
    return (request.META.get("HTTP_USER_AGENT") or "")[:300]


def device_id(request):
    """The client-supplied device fingerprint header, trimmed to the column size."""
    return (request.META.get("HTTP_X_DEVICE_ID") or "")[:128]
