import io

p = "parking/models.py"
t = io.open(p, encoding="utf-8").read()
old = '''def recompute_blocked_slots():
    """
    Single source of truth for "is a parked bus blocked", applied to the
    saved database state. See blocked_numbers_in_row for the actual rule.
    RESERVED and CAR_BIKE slots are read from slot_type, so any ground's
    real layout works without a code change. Inactive slots are ignored.
    """
    rows = ParkingSlot.objects.filter(is_active=True).values_list("row", flat=True).distinct()

    for row in rows:
        reserved_numbers = list(
            ParkingSlot.objects.filter(
                row=row, is_active=True, slot_type=ParkingSlot.SLOT_TYPE_RESERVED,
            ).values_list("slot_number", flat=True)
        )
        bus_slots = list(
            ParkingSlot.objects.filter(
                row=row, is_active=True, slot_type=ParkingSlot.SLOT_TYPE_BUS,
                is_occupied=True, bus__isnull=False,
            ).order_by("slot_number")
        )
        occupied_numbers = [s.slot_number for s in bus_slots]
        blocked_set = blocked_numbers_in_row(reserved_numbers, occupied_numbers)

        for slot in bus_slots:
            blocking = slot.slot_number in blocked_set
            if slot.is_blocked != blocking:
                slot.is_blocked = blocking
                slot.save(update_fields=["is_blocked"])'''
new = '''def recompute_blocked_slots():
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
        ParkingSlot.objects.bulk_update(changed, ["is_blocked"])'''
found = t.count(old)
if found == 1:
    t = t.replace(old, new, 1)
    io.open(p, "w", encoding="utf-8", newline="").write(t)
print("found:", found)
