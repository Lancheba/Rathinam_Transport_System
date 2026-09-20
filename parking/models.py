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


def recompute_blocked_slots():
    """
    Single source of truth for "is a parked bus blocked".

    A slot is blocked if another occupied slot in the same row has a lower
    slot_number (i.e. sits between it and the gate at slot 1). Called after
    ANY operation that parks, moves, or removes a bus — RFID/ultrasonic
    sensor events, and applying an optimisation result — so the flag never
    goes stale no matter which code path changed the layout.
    """
    for slot in ParkingSlot.objects.filter(is_occupied=True):
        blocking = ParkingSlot.objects.filter(
            row=slot.row,
            is_occupied=True,
            slot_number__lt=slot.slot_number,
        ).exists()
        if slot.is_blocked != blocking:
            slot.is_blocked = blocking
            slot.save(update_fields=["is_blocked"])