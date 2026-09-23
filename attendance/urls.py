from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    DriverBusView,
    TeacherViewSet,
    attendance_analytics_overview,
    attendance_analytics_student,
    attendance_correct,
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
    path("records/<int:record_id>/correct/", attendance_correct, name="attendance-correct"),
    path("sessions/", attendance_history, name="attendance-history"),
    path("export/", attendance_export, name="attendance-export"),
    path("my/", my_attendance, name="attendance-my"),
    path("analytics/overview/", attendance_analytics_overview, name="attendance-analytics-overview"),
    path("analytics/student/<int:student_id>/", attendance_analytics_student, name="attendance-analytics-student"),
    path("qr/generate/", qr_generate, name="attendance-qr-generate"),
    path("qr/tally/", qr_tally, name="attendance-qr-tally"),
    path("qr/scan/", qr_scan, name="attendance-qr-scan"),
    path("", include(router.urls)),
]
