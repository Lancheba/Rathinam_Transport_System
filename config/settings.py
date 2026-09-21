import os
from pathlib import Path
from datetime import timedelta

import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent



def _env_bool(name, default="0"):
    return os.environ.get(name, default).strip().lower() in ("1", "true", "yes", "on")


# Development defaults keep `runserver` working with no setup.
# For a real deployment set the DJANGO_* variables in README section "Deployment".
DEBUG = _env_bool("DJANGO_DEBUG", "1")

_DEV_SECRET_KEY = "django-insecure-dev-only-not-for-deployment-change-me"
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", _DEV_SECRET_KEY)

ALLOWED_HOSTS = [
    h.strip()
    for h in os.environ.get("DJANGO_ALLOWED_HOSTS", "*" if DEBUG else "localhost,127.0.0.1").split(",")
    if h.strip()
]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "drf_spectacular",
    # Local apps
    "accounts",
    "buses",
    "students",
    "parking",
    "sensors",
    "optimization",
    "announcements",
    "vision",
    "feedback",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",  # serves /static/ (admin CSS) when DEBUG is off
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# Falls back to local SQLite when DATABASE_URL isn't set (plain `runserver`
# development). Set DATABASE_URL in production (Railway's Postgres add-on sets
# it automatically) — Railway containers don't persist local files like
# db.sqlite3 across deploys, so SQLite alone will silently lose all data.
DATABASES = {
    "default": dj_database_url.config(
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
        conn_max_age=600,
    )
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"   # filled by: python manage.py collectstatic
STATIC_ROOT.mkdir(exist_ok=True)          # keeps WhiteNoise quiet before the first collectstatic
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- REST Framework ---
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_RATES": {
        "login": "10/min",
        "register": "10/hour",
        "optimize": "30/min",
        "feedback": "20/hour",
    },
}

# --- JWT ---
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=8),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
}

# --- CORS ---
# Open only in development. When the frontend is served by Django itself (same
# origin), no CORS is needed. When it's deployed separately (e.g. on Vercel) it
# is a different origin, so its exact URL(s) must be listed in
# DJANGO_CORS_ORIGINS (comma-separated, e.g. "https://myapp.vercel.app").
# DJANGO_CORS_ORIGIN_REGEXES is optional, for things like Vercel's per-branch
# preview URLs, e.g. "^https://myapp-.*\.vercel\.app$".
CORS_ALLOW_ALL_ORIGINS = DEBUG
CORS_ALLOWED_ORIGINS = [o.strip() for o in os.environ.get("DJANGO_CORS_ORIGINS", "").split(",") if o.strip()]
CORS_ALLOWED_ORIGIN_REGEXES = [
    r.strip() for r in os.environ.get("DJANGO_CORS_ORIGIN_REGEXES", "").split(",") if r.strip()
]

# --- CSRF ---
# Needed for /admin/ (session + CSRF cookie based) if it's ever reached through
# a custom domain or otherwise looks cross-origin to Django. Not needed for the
# API itself, which authenticates with JWTs (Authorization header), not cookies.
CSRF_TRUSTED_ORIGINS = [o.strip() for o in os.environ.get("DJANGO_CSRF_TRUSTED_ORIGINS", "").split(",") if o.strip()]

# --- Swagger ---
SPECTACULAR_SETTINGS = {
    "TITLE": "Smart Bus Parking API",
    "DESCRIPTION": "REST API for Rathinam College Smart Bus Parking & Retrieval System",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}


# --- Devices (ESP32 RFID readers, ultrasonic sensors, the camera script) ---
# Every device request must send this value in an "X-Device-Key" header.
# CHANGE IT: set the DEVICE_API_KEY environment variable before real use.
DEVICE_API_KEY = os.environ.get("DEVICE_API_KEY", "dev-device-key")

# --- Camera / YOLO tracking (see vision/linking.py) ---
VISION_MAX_SLOT_DISTANCE_M = float(os.environ.get("VISION_MAX_SLOT_DISTANCE_M", 4.0))  # detection -> slot
VISION_STABLE_FRAMES = int(os.environ.get("VISION_STABLE_FRAMES", 3))       # frames before "parked here"
VISION_LINK_MIN_FRAMES = int(os.environ.get("VISION_LINK_MIN_FRAMES", 5))   # frames before matching to an ENTRY
VISION_ENTRY_WINDOW_MIN = int(os.environ.get("VISION_ENTRY_WINDOW_MIN", 15))  # how long an ENTRY stays claimable
VISION_TRACK_TIMEOUT_S = int(os.environ.get("VISION_TRACK_TIMEOUT_S", 30))  # unseen this long -> inactive

# --- Logging: without this, errors are silent when DEBUG is off ---
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {"plain": {"format": "%(asctime)s %(levelname)s %(name)s: %(message)s"}},
    "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "plain"}},
    "loggers": {
        "django": {"handlers": ["console"], "level": "INFO"},
        "django.request": {"handlers": ["console"], "level": "WARNING", "propagate": False},
    },
}

# --- Production guards ---
if not DEBUG:
    from django.core.exceptions import ImproperlyConfigured

    if SECRET_KEY == _DEV_SECRET_KEY:
        raise ImproperlyConfigured("Set DJANGO_SECRET_KEY to a long random value when DJANGO_DEBUG=0.")
    if DEVICE_API_KEY == "dev-device-key":
        raise ImproperlyConfigured("Set DEVICE_API_KEY to a long random value when DJANGO_DEBUG=0.")

    # HTTPS hardening. Off by default so a plain-HTTP campus server keeps working;
    # switch on with DJANGO_HTTPS=1 once the site really is served over HTTPS.
    if _env_bool("DJANGO_HTTPS"):
        SECURE_SSL_REDIRECT = True
        SESSION_COOKIE_SECURE = True
        CSRF_COOKIE_SECURE = True
        SECURE_HSTS_SECONDS = 3600          # raise (e.g. 31536000) after confirming HTTPS is stable
        if _env_bool("DJANGO_BEHIND_PROXY"):  # only if a proxy you control sets X-Forwarded-Proto
            SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
