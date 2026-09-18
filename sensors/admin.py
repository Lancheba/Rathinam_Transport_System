from django.contrib import admin
from .models import Sensor, ParkingEvent


@admin.register(Sensor)
class SensorAdmin(admin.ModelAdmin):
    list_display = (
        "sensor_id",
        "sensor_type",
        "location",
        "is_active",
        "last_seen",
    )

    list_filter = (
        "sensor_type",
        "is_active",
    )

    search_fields = ("sensor_id", "location")


@admin.register(ParkingEvent)
class ParkingEventAdmin(admin.ModelAdmin):
    list_display = (
        "bus",
        "event_type",
        "sensor",
        "parking_slot",
        "timestamp",
    )

    list_filter = (
        "event_type",
        "timestamp",
    )

    search_fields = (
        "bus__bus_number",
        "sensor__sensor_id",
        "message",
    )