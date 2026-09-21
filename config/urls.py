from django.contrib import admin
from django.urls import path, include, re_path
from rest_framework_simplejwt.views import TokenRefreshView
from accounts.views import LoginView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
import mimetypes
from pathlib import Path
from django.conf import settings
from django.http import HttpResponse, FileResponse, JsonResponse


def serve_frontend(request, path=""):
    # A mistyped API URL should be a JSON 404, not the HTML app shell.
    if path.startswith("api/") or path == "api":
        return JsonResponse({"detail": "Not found."}, status=404)

    dist_dir = (settings.BASE_DIR / "frontend" / "dist").resolve()

    if path:
        try:
            candidate = (dist_dir / path).resolve()
            # Only ever serve files that live inside frontend/dist. Without this check
            # a request like /../../db.sqlite3 would download the database or settings.py.
            if candidate.is_file() and candidate.is_relative_to(dist_dir):
                content_type, _ = mimetypes.guess_type(str(candidate))
                return FileResponse(open(candidate, "rb"), content_type=content_type)
        except (ValueError, OSError):
            pass  # odd characters in the path: fall through to the app shell

    index_file = dist_dir / "index.html"
    if index_file.is_file():
        return FileResponse(open(index_file, "rb"), content_type="text/html")
    return HttpResponse(
        "<h1>Frontend build not found</h1><p>Run <code>npm run build</code> inside <code>frontend/</code>.</p>",
        status=404,
    )


urlpatterns = [
    path("admin/", admin.site.urls),

    # Auth
    path("api/auth/login/", LoginView.as_view(), name="token_obtain_pair"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/", include("accounts.urls")),

    # Core APIs
    path("api/buses/", include("buses.urls")),
    path("api/parking/", include("parking.urls")),
    path("api/", include("sensors.urls")),
    path("api/optimization/", include("optimization.urls")),
    path("api/announcements/", include("announcements.urls")),
    path("api/vision/", include("vision.urls")),

    # Swagger
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),

    # Frontend SPA Catch-All (serves Dashboard at / and all frontend routes)
    re_path(r"^(?P<path>.*)$", serve_frontend, name="frontend"),
]
