from django.db import models


class Bus(models.Model):
    bus_number = models.CharField(max_length=20, unique=True)
    rfid_uid = models.CharField(max_length=100, unique=True)
    route = models.CharField(max_length=100)
    departure_time = models.TimeField()

    length_m = models.DecimalField(max_digits=5, decimal_places=2)
    width_m = models.DecimalField(max_digits=5, decimal_places=2)

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.bus_number