from django.conf import settings
from django.db import models

from buses.models import Bus


class MaintenanceLog(models.Model):
    """
    One entry per service visit or fuel refuel, so a driver can see (and staff
    can audit) when their bus was last serviced or last filled up.
    """

    SERVICE = "SERVICE"
    FUEL = "FUEL"
    LOG_TYPES = [(SERVICE, "Service"), (FUEL, "Fuel refuel")]

    bus = models.ForeignKey(Bus, on_delete=models.CASCADE, related_name="maintenance_logs")
    log_type = models.CharField(max_length=10, choices=LOG_TYPES)
    date = models.DateField()

    odometer_km = models.PositiveIntegerField(null=True, blank=True)
    cost = models.DecimalField(max_digits=9, decimal_places=2, null=True, blank=True)
    # Only meaningful for FUEL entries; left blank for SERVICE.
    fuel_liters = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    notes = models.CharField(max_length=255, blank=True)

    logged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-created_at"]

    def __str__(self):
        return f"{self.bus.bus_number} — {self.get_log_type_display()} on {self.date}"
