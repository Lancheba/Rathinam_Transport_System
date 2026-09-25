"""
Central query-parameter parsing helpers (plan item 5.1).
Use these instead of raw int() / parse_date() on request.query_params
so a bad value returns a 400 rather than an unhandled ValueError 500.
"""
from django.utils.dateparse import parse_date as _parse_date
from rest_framework.exceptions import ValidationError


def int_param(params, name, default=None):
    """Return params[name] as int, or default if absent/blank. Raises 400 on bad input."""
    raw = (params.get(name) or "").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except (ValueError, TypeError):
        raise ValidationError({name: f"'{raw}' is not a valid integer."})


def date_param(params, name, default=None):
    """Return params[name] as a date, or default if absent/blank. Raises 400 on bad input."""
    raw = (params.get(name) or "").strip()
    if not raw:
        return default
    result = _parse_date(raw)
    if result is None:
        raise ValidationError({name: f"'{raw}' is not a valid date (use YYYY-MM-DD)."})
    return result
