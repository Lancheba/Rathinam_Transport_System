from django.contrib import admin
from django.urls import path, include, re_path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
import mimetypes
from pathlib import Path
from django.conf import settings
from django.http import HttpResponse, FileResponse


def serve_frontend(request, path=""):
    dist_dir = settings.BASE_DIR / "frontend" / "dist"
    if path:
        file_path = dist_dir / path
        if file_path.exists() and file_path.is_file():
            content_type, _ = mimetypes.guess_type(str(file_path))
            return FileResponse(open(file_path, "rb"), content_type=content_type)
    index_file = dist_dir / "index.html"
    if index_file.exists():
        return HttpResponse(open(index_file, "r", encoding="utf-8").read(), content_type="text/html")
    return HttpResponse(
        "<h1>Frontend build not found</h1><p>Run <code>npm run build</code> inside <code>frontend/</code>.</p>",
        status=404
    )


urlpatterns = [
    path("admin/", admin.site.urls),

    # Auth
    path("api/auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
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
