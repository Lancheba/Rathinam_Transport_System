from .revoke_views import attendance_revoke
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
    attendance_window_config,
    my_attendance,
)
from .qr_views import qr_generate, qr_manual_mark, qr_roster, qr_scan, qr_stop, qr_status, qr_tally, qr_window
from .report_views import attendance_report
from .flag_views import flag_list, flag_review
router = DefaultRouter()
router.register("teachers", TeacherViewSet, basename="teacher")

urlpatterns = [
    path("my-bus/", DriverBusView.as_view(), name="driver-my-bus"),
    path("roster/", attendance_roster, name="attendance-roster"),
    path("submit/", attendance_submit, name="attendance-submit"),
    path("records/<int:record_id>/correct/", attendance_correct, name="attendance-correct"),
    path("records/<int:record_id>/revoke/", attendance_revoke, name="attendance-revoke"),
    path("sessions/", attendance_history, name="attendance-history"),
    path("export/", attendance_export, name="attendance-export"),
    path("report/", attendance_report, name="attendance-report"),
    path("my/", my_attendance, name="attendance-my"),
    path("window-config/", attendance_window_config, name="attendance-window-config"),
    path("analytics/overview/", attendance_analytics_overview, name="attendance-analytics-overview"),
    path("analytics/student/<int:student_id>/", attendance_analytics_student, name="attendance-analytics-student"),
    path("qr/generate/", qr_generate, name="attendance-qr-generate"),
    path("qr/tally/", qr_tally, name="attendance-qr-tally"),
    path("qr/window/", qr_window, name="attendance-qr-window"),
    path("qr/stop/", qr_stop, name="attendance-qr-stop"),
    path("qr/status/", qr_status, name="attendance-qr-status"),
    path("qr/scan/", qr_scan, name="attendance-qr-scan"),
    path("qr/manual/", qr_manual_mark, name="attendance-qr-manual"),
    path("qr/roster/", qr_roster, name="attendance-qr-roster"),
    path("flags/", flag_list, name="attendance-flag-list"),
    path("flags/<int:flag_id>/review/", flag_review, name="attendance-flag-review"),
    path("", include(router.urls)),
]
