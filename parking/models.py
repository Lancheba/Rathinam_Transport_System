from django.db import models


class ParkingGround(models.Model):
    name = models.CharField(max_length=100, default="College Bus Parking Ground")

    length_m = models.DecimalField(max_digits=6, decimal_places=2, default=60.00)
    width_m = models.DecimalField(max_digits=6, decimal_places=2, default=35.00)

    entrance_width_m = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=6.00
    )

    exit_width_m = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=6.00
    )

    total_slots = models.PositiveIntegerField(default=32)

    def __str__(self):
        return self.name


class ParkingSlot(models.Model):
    ground = models.ForeignKey(
        ParkingGround,
        on_delete=models.CASCADE,
        related_name="slots"
    )

    row = models.CharField(max_length=10)
    slot_number = models.PositiveIntegerField()

    x_position_m = models.DecimalField(max_digits=7, decimal_places=2)
    y_position_m = models.DecimalField(max_digits=7, decimal_places=2)

    is_occupied = models.BooleanField(default=False)
    is_blocked = models.BooleanField(default=False)

    bus = models.OneToOneField(
        "buses.Bus",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="parking_slot"
    )

    def __str__(self):
        return f"{self.row} - Slot {self.slot_number}"