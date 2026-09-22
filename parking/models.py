from django.db import models


class ParkingGround(models.Model):
    name = models.CharField(max_length=100)

    length_m = models.DecimalField(max_digits=6, decimal_places=2)
    width_m = models.DecimalField(max_digits=6, decimal_places=2)

    entrance_width_m = models.DecimalField(max_digits=5, decimal_places=2)

    exit_width_m = models.DecimalField(max_digits=5, decimal_places=2)

    total_slots = models.PositiveIntegerField()

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


# Slots permanently reserved for cars & bikes — never treated as bus blockers.
RESERVED_SLOTS = {
    "B": (1, 2, 3),
    "C": (1, 2, 3),
}


def recompute_blocked_slots():
    """
    Single source of truth for "is a parked bus blocked".

    A slot is blocked if another bus-occupied slot in the same row has a lower
    slot_number between it and the gate. Reserved slots (B1-B3, C1-C3) are
    completely ignored so buses at B4+ and C4+ are never falsely blocked.
    """
    for slot in ParkingSlot.objects.filter(is_occupied=True, bus__isnull=False):
        reserved = RESERVED_SLOTS.get(slot.row, ())
        if slot.slot_number in reserved:
            continue
        # Find the effective gate slot number for this row
        # (first slot number after the reserved zone, or 1 if no reserved zone)
        gate_slot = max(reserved) + 1 if reserved else 1

        blocking = ParkingSlot.objects.filter(
            row=slot.row,
            is_occupied=True,
            bus__isnull=False,
            slot_number__lt=slot.slot_number,
            slot_number__gte=gate_slot,
        ).exists()

        if slot.is_blocked != blocking:
            slot.is_blocked = blocking
            slot.save(update_fields=["is_blocked"])
