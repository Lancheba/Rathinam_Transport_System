from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    DriverBusView,
    TeacherViewSet,
    attendance_export,
    attendance_history,
    attendance_roster,
    attendance_submit,
    my_attendance,
)
from .qr_views import qr_generate, qr_scan, qr_tally

router = DefaultRouter()
router.register("teachers", TeacherViewSet, basename="teacher")

urlpatterns = [
    path("my-bus/", DriverBusView.as_view(), name="driver-my-bus"),
    path("roster/", attendance_roster, name="attendance-roster"),
    path("submit/", attendance_submit, name="attendance-submit"),
    path("sessions/", attendance_history, name="attendance-history"),
    path("export/", attendance_export, name="attendance-export"),
    path("my/", my_attendance, name="attendance-my"),
    path("qr/generate/", qr_generate, name="attendance-qr-generate"),
    path("qr/tally/", qr_tally, name="attendance-qr-tally"),
    path("qr/scan/", qr_scan, name="attendance-qr-scan"),
    path("", include(router.urls)),
]
