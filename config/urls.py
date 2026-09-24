from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from accounts.views import LoginView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


def json_not_found(request, exception=None):
    """404 handler for the whole project.

    This backend is an API only: the React frontend is hosted separately on Vercel.
    Any URL that matches nothing gets a JSON 404 instead of an HTML page.
    """
    return JsonResponse({"detail": "Not found."}, status=404)


handler404 = json_not_found

urlpatterns = [
    path("admin/", admin.site.urls),

    # Auth
    path("api/auth/login/", LoginView.as_view(), name="token_obtain_pair"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/", include("accounts.urls")),

    # Core APIs
    path("api/buses/", include("buses.urls")),
    path("api/students/", include("students.urls")),
    path("api/parking/", include("parking.urls")),
    path("api/", include("sensors.urls")),
    path("api/optimization/", include("optimization.urls")),
    path("api/announcements/", include("announcements.urls")),
    path("api/vision/", include("vision.urls")),
    path("api/feedback/", include("feedback.urls")),
    path("api/attendance/", include("attendance.urls")),
    path("api/maintenance/", include("maintenance.urls")),

    # Swagger
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]