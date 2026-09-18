from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SensorViewSet, ParkingEventViewSet, rfid_event, occupancy_event

router = DefaultRouter()
router.register("sensors", SensorViewSet, basename="sensor")
router.register("events", ParkingEventViewSet, basename="event")

urlpatterns = [
    path("", include(router.urls)),
    path("sensors/rfid/", rfid_event, name="rfid-event"),
    path("sensors/occupancy/", occupancy_event, name="occupancy-event"),
]
