from django.urls import path

from .views import positions, track_assign, track_list

urlpatterns = [
    path("positions/", positions, name="vision-positions"),
    path("tracks/", track_list, name="vision-tracks"),
    path("tracks/<int:pk>/assign/", track_assign, name="vision-track-assign"),
]
