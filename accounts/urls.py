from django.urls import path
from .views import (
    LinkRequestApproveView,
    LinkRequestListView,
    LinkRequestRejectView,
    LogoutView,
    MeView,
    RegisterView,
    SetIdentityView,
    TeacherLinkView,
    PeopleListView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("me/", MeView.as_view(), name="me"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/identity/", SetIdentityView.as_view(), name="set-identity"),
    path("me/teacher-link/", TeacherLinkView.as_view(), name="teacher-link"),
    path("people/", PeopleListView.as_view(), name="people-list"),
    path("link-requests/", LinkRequestListView.as_view(), name="link-request-list"),
    path("link-requests/<int:pk>/approve/", LinkRequestApproveView.as_view(), name="link-request-approve"),
    path("link-requests/<int:pk>/reject/", LinkRequestRejectView.as_view(), name="link-request-reject"),
]
