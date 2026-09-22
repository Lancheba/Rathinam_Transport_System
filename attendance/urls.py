from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    DriverBusView,
    TeacherViewSet,
    attendance_export,
    attendance_history,
    attendance_roster,
    attendance_submit,
)

router = DefaultRouter()
router.register("teachers", TeacherViewSet, basename="teacher")

urlpatterns = [
    path("my-bus/", DriverBusView.as_view(), name="driver-my-bus"),
    path("roster/", attendance_roster, name="attendance-roster"),
    path("submit/", attendance_submit, name="attendance-submit"),
    path("sessions/", attendance_history, name="attendance-history"),
    path("export/", attendance_export, name="attendance-export"),
    path("", include(router.urls)),
]
