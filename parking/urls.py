from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ParkingGroundViewSet, ParkingSlotViewSet, parking_summary

router = DefaultRouter()
router.register("ground", ParkingGroundViewSet, basename="ground")
router.register("slots", ParkingSlotViewSet, basename="slot")

urlpatterns = [
    path("", include(router.urls)),
    path("summary/", parking_summary, name="parking-summary"),
]
