"""
Parking Optimisation Engine
============================
Strategy: sort buses by departure time (earliest first) and assign them to
BUS-type slots closest to the exit (lowest slot_number in each row). This
minimises blocking -- a bus leaving early will never be blocked by one that
leaves later.

READ-ONLY (run_optimization): never writes to the database. The result is
only a preview until staff click "Apply" (apply_optimization).

Plan item 4.4:
  - "One definition of blocked": both layouts are scored with
    parking.models.blocked_numbers_in_row, the exact same rule the live
    system uses -- never a second, drifted reimplementation.
  - "Respect RESERVED": only active, BUS-type slots are ever candidates.
    RESERVED and CAR_BIKE slots are never assigned a bus.
  - "Output a move plan and cost": `moves` lists exactly which bus goes
    from which slot to which slot; `cost_m` is the total distance those
    buses would have to travel.
"""
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from parking.models import ParkingSlot, blocked_numbers_in_row, recompute_blocked_slots
from buses.models import Bus
from sensors.models import ParkingEvent


class StaleOptimization(Exception):
    """Raised when the ground has changed since a preview was computed. Nothing is written."""


def _reserved_numbers_by_row():
    out = {}
    for row, number in ParkingSlot.objects.filter(
        is_active=True, slot_type=ParkingSlot.SLOT_TYPE_RESERVED
    ).values_list("row", "slot_number"):
        out.setdefault(row, []).append(number)
    return out


def _score_blocking(layout_items, reserved_by_row):
    """Sets is_blocked on every item in-place using the one shared rule. Returns the total blocked."""
    by_row = {}
    for item in layout_items:
        by_row.setdefault(item["row"], []).append(item)
    blocked_total = 0
    for row, items in by_row.items():
        occupied_numbers = [i["slot_number"] for i in items]
        blocked_set = blocked_numbers_in_row(reserved_by_row.get(row, []), occupied_numbers)
        for item in items:
            item["is_blocked"] = item["slot_number"] in blocked_set
            if item["is_blocked"]:
                blocked_total += 1
    return blocked_total


def _distance_m(x1, y1, x2, y2):
    d = ((Decimal(str(x1)) - Decimal(str(x2))) ** 2 + (Decimal(str(y1)) - Decimal(str(y2))) ** 2)
    return float(d) ** 0.5


def run_optimization():
    """Returns current + recommended layouts, the move plan, its cost, and stats. Writes nothing."""
    reserved_by_row = _reserved_numbers_by_row()

    occupied_slots = (
        ParkingSlot.objects
        .filter(is_active=True, slot_type=ParkingSlot.SLOT_TYPE_BUS, is_occupied=True, bus__isnull=False)
        .select_related("bus")
        .order_by("row", "slot_number")
    )
    current_by_bus = {}
    current_layout = []
    for slot in occupied_slots:
        item = {
            "slot_id": slot.pk, "label": f"{slot.row}{slot.slot_number}",
            "row": slot.row, "slot_number": slot.slot_number,
            "x": float(slot.x_position_m), "y": float(slot.y_position_m),
            "bus_id": slot.bus.pk, "bus_number": slot.bus.bus_number,
            "departure_time": str(slot.bus.departure_time),
        }
        current_layout.append(item)
        current_by_bus[slot.bus_id] = (slot, item)
    blocked_before = _score_blocking(current_layout, reserved_by_row)

    buses = sorted((s.bus for s in occupied_slots), key=lambda b: b.departure_time)

    bus_type_slots = list(
        ParkingSlot.objects.filter(is_active=True, slot_type=ParkingSlot.SLOT_TYPE_BUS).order_by("row", "slot_number")
    )
    rows = sorted({s.row for s in bus_type_slots})
    slots_by_row = {r: [s for s in bus_type_slots if s.row == r] for r in rows}

    recommended_layout = []
    bus_index = 0
    for row in rows:
        for slot in slots_by_row[row]:
            if bus_index >= len(buses):
                break
            bus = buses[bus_index]
            bus_index += 1
            recommended_layout.append({
                "slot_id": slot.pk, "label": f"{slot.row}{slot.slot_number}",
                "row": slot.row, "slot_number": slot.slot_number,
                "x": float(slot.x_position_m), "y": float(slot.y_position_m),
                "bus_id": bus.pk, "bus_number": bus.bus_number,
                "departure_time": str(bus.departure_time),
            })
    blocked_after = _score_blocking(recommended_layout, reserved_by_row)

    moves = []
    cost = 0.0
    for item in recommended_layout:
        old_slot, old_item = current_by_bus.get(item["bus_id"], (None, None))
        if old_slot is not None and old_slot.pk == item["slot_id"]:
            continue
        move = {
            "bus_id": item["bus_id"], "bus_number": item["bus_number"],
            "from_slot": old_item["label"] if old_item else None,
            "to_slot": item["label"],
        }
        if old_item is not None:
            move["distance_m"] = round(_distance_m(old_item["x"], old_item["y"], item["x"], item["y"]), 2)
            cost += move["distance_m"]
        else:
            move["distance_m"] = None
        moves.append(move)

    return {
        "current": current_layout,
        "recommended": recommended_layout,
        "moves": moves,
        "stats": {
            "blocked_before": blocked_before,
            "blocked_after": blocked_after,
            "movements_required": len(moves),
            "buses_optimised": len(buses),
            "cost_m": round(cost, 2),
        },
    }


def apply_optimization(opt):
    """
    Apply a previously computed OptimizationResult. Locks every slot the
    preview touched, re-checks the live layout still matches what the
    preview was computed against (staleness check -- someone may have
    parked or moved a bus by hand between Run and Apply), writes the
    recommended layout, and logs one ParkingEvent(event_type="MOVED") per
    bus that actually relocates (the audit event). One transaction: either
    the whole layout changes or none of it does. Raises StaleOptimization
    (writing nothing) if the ground moved on since the preview.
    """
    layout = opt.get_layout()
    stored_current = layout.get("current", [])
    recommended = layout.get("recommended", [])
    moves = layout.get("moves", [])

    with transaction.atomic():
        slot_ids = {item["slot_id"] for item in stored_current} | {item["slot_id"] for item in recommended}
        locked = {s.pk: s for s in ParkingSlot.objects.select_for_update().filter(pk__in=slot_ids)}

        live_mapping = {pk: (s.bus_id if s.is_occupied else None) for pk, s in locked.items()}
        stored_mapping = {item["slot_id"]: item["bus_id"] for item in stored_current}
        if any(live_mapping.get(slot_id) != bus_id for slot_id, bus_id in stored_mapping.items()):
            raise StaleOptimization(
                "The parking ground changed since this preview was computed. Re-run optimization."
            )

        recommended_bus_for_slot = {item["slot_id"]: item["bus_id"] for item in recommended}
        buses_by_id = {b.pk: b for b in Bus.objects.filter(pk__in=set(recommended_bus_for_slot.values()))}

        # Two-phase write: clear every touched slot's bus to NULL first, then
        # assign the final buses. bus_id is UNIQUE (OneToOneField), and
        # bulk_update's single CASE/WHEN statement is still applied row by
        # row on SQLite, so going straight from old bus to new bus in one
        # pass can transiently put two slots on the same bus_id mid-update
        # and trip the constraint even though the final state is valid.
        # Clearing to NULL first means every row's final value in phase two
        # is reached from NULL, never from another row's soon-to-change value.
        for slot in locked.values():
            slot.bus = None
            slot.is_occupied = False
            slot.is_blocked = False
        ParkingSlot.objects.bulk_update(list(locked.values()), ["bus", "is_occupied", "is_blocked"])

        for slot in locked.values():
            new_bus_id = recommended_bus_for_slot.get(slot.pk)
            slot.bus = buses_by_id.get(new_bus_id) if new_bus_id else None
            slot.is_occupied = new_bus_id is not None
        ParkingSlot.objects.bulk_update(list(locked.values()), ["bus", "is_occupied"])

        recompute_blocked_slots()

        recommended_slot_by_bus = {item["bus_id"]: item["slot_id"] for item in recommended}
        for m in moves:
            bus = buses_by_id.get(m["bus_id"])
            if bus is None:
                continue
            slot = locked.get(recommended_slot_by_bus.get(bus.pk))
            ParkingEvent.objects.create(
                bus=bus, parking_slot=slot, event_type="MOVED",
                message=f"Optimizer #{opt.pk} moved {bus.bus_number} from "
                        f"{m['from_slot'] or 'nowhere'} to {m['to_slot']}.",
            )

        opt.applied_at = timezone.now()
        opt.save(update_fields=["applied_at"])
