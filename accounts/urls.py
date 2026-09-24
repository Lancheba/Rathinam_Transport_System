from django.urls import path
from .views import (
    LinkRequestApproveView,
    LinkRequestListView,
    LinkRequestRejectView,
    MeView,
    RegisterView,
    SetIdentityView,
    TeacherLinkView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("me/", MeView.as_view(), name="me"),
    path("me/identity/", SetIdentityView.as_view(), name="set-identity"),
    path("me/teacher-link/", TeacherLinkView.as_view(), name="teacher-link"),
    path("link-requests/", LinkRequestListView.as_view(), name="link-request-list"),
    path("link-requests/<int:pk>/approve/", LinkRequestApproveView.as_view(), name="link-request-approve"),
    path("link-requests/<int:pk>/reject/", LinkRequestRejectView.as_view(), name="link-request-reject"),
]
