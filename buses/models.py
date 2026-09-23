from django.conf import settings
from django.db import models


class Bus(models.Model):
    bus_number = models.CharField(max_length=20, unique=True)
    rfid_uid = models.CharField(max_length=100, unique=True)
    route = models.CharField(max_length=100)
    departure_time = models.TimeField()

    length_m = models.DecimalField(max_digits=5, decimal_places=2)
    width_m = models.DecimalField(max_digits=5, decimal_places=2)

    is_active = models.BooleanField(default=True)

    # The driver who owns this bus for attendance/cab-capacity purposes.
    # One user (role=DRIVER) can be linked to at most one bus, and a bus has
    # at most one driver. Set by the driver themselves from the "My bus"
    # setup screen (or by an admin), not by public sign-up.
    driver = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="driven_bus",
    )

    incharge = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="incharge_bus",
    )

    # How many students / teachers the driver has said normally ride this cab.
    # This is a headcount the driver maintains, separate from (and usually
    # close to, but not required to match) the number of roster rows actually
    # assigned to the bus.
    student_capacity = models.PositiveIntegerField(default=0)
    teacher_capacity = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.bus_number
