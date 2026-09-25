from django.db import models


class Sensor(models.Model):
    SENSOR_TYPES = [
        ("RFID", "RFID"),
        ("ULTRASONIC", "Ultrasonic"),
        ("CAMERA", "Camera"),
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


class SensorAlert(models.Model):
    """
    Plan item 4.3: a camera going offline, or a slot losing its live camera
    confirmation, needs to be visible somewhere -- this is that "somewhere".
    Open until resolved_at is set, which happens automatically the moment
    the underlying condition clears (a fresh frame from the camera, or a
    confirmed sighting reconfirming the slot).
    """

    CAMERA_OFFLINE = "CAMERA_OFFLINE"
    SLOT_UNCONFIRMED = "SLOT_UNCONFIRMED"
    ALERT_TYPES = [
        (CAMERA_OFFLINE, "Camera offline"),
        (SLOT_UNCONFIRMED, "Slot unconfirmed"),
    ]

    sensor = models.ForeignKey(
        Sensor, null=True, blank=True, on_delete=models.SET_NULL, related_name="alerts"
    )
    parking_slot = models.ForeignKey(
        ParkingSlot, null=True, blank=True, on_delete=models.SET_NULL, related_name="alerts"
    )
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPES)
    message = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        status = "open" if self.resolved_at is None else "resolved"
        return f"{self.get_alert_type_display()} ({status})"
