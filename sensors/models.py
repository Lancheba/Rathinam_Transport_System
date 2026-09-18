from django.db import models


class Sensor(models.Model):
    SENSOR_TYPES = [
        ("RFID", "RFID"),
        ("ULTRASONIC", "Ultrasonic"),
    ]

    sensor_id = models.CharField(max_length=50, unique=True)
    sensor_type = models.CharField(
        max_length=20,
        choices=SENSOR_TYPES
    )

    location = models.CharField(max_length=100)

    is_active = models.BooleanField(default=True)

    last_reading = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )

    last_seen = models.DateTimeField(
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.sensor_id} - {self.sensor_type}"
from buses.models import Bus
from parking.models import ParkingSlot


class ParkingEvent(models.Model):
    EVENT_TYPES = [
        ("ENTRY", "Bus Entry"),
        ("EXIT", "Bus Exit"),
        ("DETECTED", "Bus Detected"),
        ("MOVED", "Bus Moved"),
        ("PARKED", "Bus Parked"),
    ]

    bus = models.ForeignKey(
        Bus,
        on_delete=models.CASCADE,
        related_name="parking_events"
    )

    sensor = models.ForeignKey(
        Sensor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="parking_events"
    )

    parking_slot = models.ForeignKey(
        ParkingSlot,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="parking_events"
    )

    event_type = models.CharField(
        max_length=20,
        choices=EVENT_TYPES
    )

    message = models.CharField(max_length=255, blank=True)

    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.bus.bus_number} - {self.event_type}"