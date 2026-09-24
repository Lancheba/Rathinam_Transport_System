"""
Parking Optimisation Engine
===========================
Strategy: Sort buses by departure time (earliest first) and assign them to
slots closest to the exit (lowest slot_number in each row).
This minimises blocking — a bus leaving early will never be blocked by
one that leaves later.
"""
from parking.models import ParkingSlot, recompute_blocked_slots
from buses.models import Bus


def run_optimization():
    """
    Returns a dict describing the current and recommended layouts.
    Does NOT write to the database — the result is used for display only
    until staff clicks "Apply".
    """
    # Self-heal: a slot marked occupied with no bus attached is a leftover
    # from a bus that was deleted while still parked. Free it up first so
    # it never crashes the layout below.
    ParkingSlot.objects.filter(is_occupied=True, bus__isnull=True).update(
        is_occupied=False, is_blocked=False
    )

    occupied_slots = (
        ParkingSlot.objects
        .filter(is_occupied=True)
        .select_related("bus")
        .order_by("row", "slot_number")
    )

    all_slots = (
        ParkingSlot.objects
        .all()
        .order_by("row", "slot_number")
    )

    # ---------- Current layout ----------
    current_layout = []
    blocked_before = 0
    for slot in occupied_slots:
        is_blocked = ParkingSlot.objects.filter(
            row=slot.row,
            is_occupied=True,
            slot_number__lt=slot.slot_number,
        ).exists()
        current_layout.append({
            "slot_id": slot.pk,
            "label": f"{slot.row}{slot.slot_number}",
            "row": slot.row,
            "slot_number": slot.slot_number,
            "x": float(slot.x_position_m),
            "y": float(slot.y_position_m),
            "bus_id": slot.bus.pk,
            "bus_number": slot.bus.bus_number,
            "departure_time": str(slot.bus.departure_time),
            "is_blocked": is_blocked,
        })
        if is_blocked:
            blocked_before += 1

    # ---------- Optimised layout ----------
    # Collect buses sorted by departure time (earliest first)
    buses = sorted(
        [s.bus for s in occupied_slots],
        key=lambda b: b.departure_time,
    )

    # Group free + occupied slots by row; assign buses front-to-back
    available_slots = list(all_slots)
    # Use the same number of rows; fill from slot_number 1 in each row
    # We'll distribute across rows to keep original row structure
    rows = sorted(set(s.row for s in all_slots))
    slots_by_row = {r: [s for s in available_slots if s.row == r] for r in rows}

    recommended_layout = []
    bus_index = 0
    movements = 0
    for row in rows:
        row_slots = slots_by_row[row]
        for slot in row_slots:
            if bus_index >= len(buses):
                break
            bus = buses[bus_index]
            # Was bus in a different slot before?
            try:
                original_slot = bus.parking_slot
                moved = (original_slot.pk != slot.pk)
            except Exception:
                moved = False
            if moved:
                movements += 1

            recommended_layout.append({
                "slot_id": slot.pk,
                "label": f"{slot.row}{slot.slot_number}",
                "row": slot.row,
                "slot_number": slot.slot_number,
                "x": float(slot.x_position_m),
                "y": float(slot.y_position_m),
                "bus_id": bus.pk,
                "bus_number": bus.bus_number,
                "departure_time": str(bus.departure_time),
                "is_blocked": False,  # filled in below, once every row's contents are known
            })
            bus_index += 1

    # A slot is blocked if another slot in the SAME ROW of the recommended
    # layout has a lower slot_number (sits between it and the gate). Filling
    # a row front-to-back in departure order minimises how long each bus
    # sits blocked, but any row holding 2+ buses still has blocked buses —
    # this must be computed, never assumed to be zero.
    blocked_after = 0
    for item in recommended_layout:
        item["is_blocked"] = any(
            other["row"] == item["row"] and other["slot_number"] < item["slot_number"]
            for other in recommended_layout
        )
        if item["is_blocked"]:
            blocked_after += 1

    return {
        "current": current_layout,
        "recommended": recommended_layout,
        "stats": {
            "blocked_before": blocked_before,
            "blocked_after": blocked_after,
            "movements_required": movements,
            "buses_optimised": len(buses),
        },
    }


def apply_optimization(recommended_layout):
    """
    Writes the recommended layout to the database.
    Clears all current slot assignments then sets new ones.
    """
    # Clear all slots
    ParkingSlot.objects.all().update(is_occupied=False, bus=None, is_blocked=False)

    # Apply recommended
    for item in recommended_layout:
        try:
            slot = ParkingSlot.objects.get(pk=item["slot_id"])
            bus = Bus.objects.get(pk=item["bus_id"])
            slot.bus = bus
            slot.is_occupied = True
            slot.save()
        except Exception:
            pass

    # Recompute is_blocked from the actual saved layout — never assume a
    # row with several buses in it has nobody blocked.
    recompute_blocked_slots()
