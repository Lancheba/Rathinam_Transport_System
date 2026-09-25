from django.db import models
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver


class ParkingGround(models.Model):
    name = models.CharField(max_length=100)

    length_m = models.DecimalField(max_digits=6, decimal_places=2)
    width_m = models.DecimalField(max_digits=6, decimal_places=2)

    entrance_width_m = models.DecimalField(max_digits=5, decimal_places=2)

    exit_width_m = models.DecimalField(max_digits=5, decimal_places=2)

    # Kept in sync automatically by the ParkingSlot post_save/post_delete
    # signals below -- never set this by hand. It always equals the count
    # of this ground's active slots (plan item 4.1: "computed total_slots").
    total_slots = models.PositiveIntegerField(default=0)

    def __str__(self):
        return self.name

    def recompute_total_slots(self):
        actual = self.slots.filter(is_active=True).count()
        if self.total_slots != actual:
            ParkingGround.objects.filter(pk=self.pk).update(total_slots=actual)
            self.total_slots = actual


class ParkingSlot(models.Model):
    SLOT_TYPE_BUS = "BUS"
    SLOT_TYPE_RESERVED = "RESERVED"
    SLOT_TYPE_CAR_BIKE = "CAR_BIKE"
    SLOT_TYPE_CHOICES = [
        (SLOT_TYPE_BUS, "Bus"),
        (SLOT_TYPE_RESERVED, "Reserved"),
        (SLOT_TYPE_CAR_BIKE, "Car / Bike"),
    ]

    ground = models.ForeignKey(
        ParkingGround,
        on_delete=models.CASCADE,
        related_name="slots"
    )

    row = models.CharField(max_length=10)
    slot_number = models.PositiveIntegerField()

    slot_type = models.CharField(max_length=10, choices=SLOT_TYPE_CHOICES, default=SLOT_TYPE_BUS)
    # Soft-delete: an inactive slot is excluded from total_slots, the
    # optimizer and the blocking calculation, without breaking FK history.
    is_active = models.BooleanField(default=True)

    x_position_m = models.DecimalField(max_digits=7, decimal_places=2)
    y_position_m = models.DecimalField(max_digits=7, decimal_places=2)

    is_occupied = models.BooleanField(default=False)
    is_blocked = models.BooleanField(default=False)
    # Plan item 4.3: True means the database still shows a bus here but
    # there is currently no live, camera-confirmed sighting backing that up
    # (the camera lost the track, or a FIFO guess hasn't been corroborated
    # yet). Cleared automatically the moment a confirmed sighting reconfirms it.
    is_unconfirmed = models.BooleanField(default=False)

    bus = models.OneToOneField(
        "buses.Bus",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="parking_slot"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["ground", "row", "slot_number"],
                name="unique_ground_row_slot",
            ),
        ]

    def __str__(self):
        return f"{self.row} - Slot {self.slot_number}"


@receiver(post_save, sender=ParkingSlot)
def _slot_saved(sender, instance, **kwargs):
    instance.ground.recompute_total_slots()


@receiver(post_delete, sender=ParkingSlot)
def _slot_deleted(sender, instance, **kwargs):
    try:
        instance.ground.recompute_total_slots()
    except ParkingGround.DoesNotExist:
        pass


def blocked_numbers_in_row(reserved_numbers, occupied_numbers):
    """
    Pure function: the single definition of "blocked" (plan item 4.4), used
    by both recompute_blocked_slots (against saved slots) and the optimizer
    (against a candidate layout it has not written yet), so a preview can
    never disagree with what the live system will actually show.

    reserved_numbers: slot_numbers with slot_type RESERVED in this row.
    occupied_numbers: slot_numbers with slot_type BUS that hold a bus.
    Returns the subset of occupied_numbers that are blocked -- one with a
    lower, gate-side occupied slot_number between it and the gate.
    """
    gate_slot = max(reserved_numbers) + 1 if reserved_numbers else 1
    return {
        n for n in occupied_numbers
        if any(gate_slot <= m < n for m in occupied_numbers)
    }


def recompute_blocked_slots():
    """
    Single source of truth for "is a parked bus blocked", applied to the
    saved database state. See blocked_numbers_in_row for the actual rule.
    RESERVED and CAR_BIKE slots are read from slot_type, so any ground's
    real layout works without a code change. Inactive slots are ignored.

    Plan item 4.5: one SELECT for every active RESERVED/BUS slot across all
    rows/grounds, grouped in Python by row, then a single bulk_update() for
    whichever rows actually changed -- not a query-and-save per row.
    """
    slots = list(
        ParkingSlot.objects.filter(
            is_active=True,
            slot_type__in=(ParkingSlot.SLOT_TYPE_RESERVED, ParkingSlot.SLOT_TYPE_BUS),
        )
    )

    by_row = {}
    for slot in slots:
        by_row.setdefault((slot.ground_id, slot.row), []).append(slot)

    changed = []
    for row_slots in by_row.values():
        reserved_numbers = [
            s.slot_number for s in row_slots if s.slot_type == ParkingSlot.SLOT_TYPE_RESERVED
        ]
        bus_slots = [
            s for s in row_slots
            if s.slot_type == ParkingSlot.SLOT_TYPE_BUS and s.is_occupied and s.bus_id
        ]
        occupied_numbers = [s.slot_number for s in bus_slots]
        blocked_set = blocked_numbers_in_row(reserved_numbers, occupied_numbers)

        for slot in bus_slots:
            blocking = slot.slot_number in blocked_set
            if slot.is_blocked != blocking:
                slot.is_blocked = blocking
                changed.append(slot)

    if changed:
        ParkingSlot.objects.bulk_update(changed, ["is_blocked"])
