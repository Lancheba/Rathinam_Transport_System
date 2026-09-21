from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SensorViewSet, ParkingEventViewSet, rfid_event, occupancy_event

router = DefaultRouter()
router.register("sensors", SensorViewSet, basename="sensor")
router.register("events", ParkingEventViewSet, basename="event")

# The explicit device routes MUST come before the router: otherwise the router's
# "sensors/<pk>/" pattern swallows "sensors/rfid/" and "sensors/occupancy/".
urlpatterns = [
    path("sensors/rfid/", rfid_event, name="rfid-event"),
    path("sensors/occupancy/", occupancy_event, name="occupancy-event"),
    path("", include(router.urls)),
]
