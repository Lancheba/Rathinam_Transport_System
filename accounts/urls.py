from django.urls import path
from .views import RegisterView, MeView, SetIdentityView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("me/", MeView.as_view(), name="me"),
    path("me/identity/", SetIdentityView.as_view(), name="set-identity"),
]
