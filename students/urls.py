from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StudentViewSet, student_summary, MyStudentLinkView

router = DefaultRouter()
router.register("", StudentViewSet, basename="student")

urlpatterns = [
    path("summary/", student_summary, name="student-summary"),
    path("me/", MyStudentLinkView.as_view(), name="student-me"),
    path("", include(router.urls)),
]
