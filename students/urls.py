from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StudentViewSet, student_summary, MyStudentLinkView
from .face_views import face_enrollment

router = DefaultRouter()
router.register("", StudentViewSet, basename="student")

urlpatterns = [
    path("summary/", student_summary, name="student-summary"),
    path("me/", MyStudentLinkView.as_view(), name="student-me"),
    path("me/face-enrollment/", face_enrollment, name="student-face-enrollment"),
    path("", include(router.urls)),
]
