from django.db import transaction

from .models import ParkingSlot, recompute_blocked_slots


class ParkingError(Exception):
    """Base class for parking service errors."""


class SlotNotFound(ParkingError):
    """Raised when a slot_id does not exist. Views turn this into a 404."""


class SlotUnavailable(ParkingError):
    """Raised when an explicitly requested slot is already taken by another bus."""


@transaction.atomic
def assign_bus(bus, slot=None, sensor=None, event_type="PARKED"):
    """
    Put `bus` into `slot` (or the first free BUS-type slot if slot is None).
    Locks the slot(s) involved with select_for_update so two concurrent
    requests can never both grab the same slot. Idempotent: assigning a bus
    to the slot it is already in is a no-op. Writes exactly one ParkingEvent.
    Returns the ParkingSlot, or None if no free slot was available.
    """
    from sensors.models import ParkingEvent  # local import: avoids sensors <-> parking circular import

    if slot is not None:
        slot = ParkingSlot.objects.select_for_update().get(pk=slot.pk)
        if slot.is_occupied and slot.bus_id != bus.pk:
            raise SlotUnavailable(f"Slot {slot} is already occupied")
    else:
        slot = (
            ParkingSlot.objects.select_for_update()
            .filter(
                is_active=True,
                slot_type=ParkingSlot.SLOT_TYPE_BUS,
                is_occupied=False,
                bus__isnull=True,
            )
            .order_by("row", "slot_number")
            .first()
        )
        if slot is None:
            return None

    if slot.is_occupied and slot.bus_id == bus.pk:
        return slot

    # Clear any other slot this bus is currently sitting in, locked too, so
    # there is never a window where two slots both claim the same bus.
    previous_slots = ParkingSlot.objects.select_for_update().filter(bus=bus).exclude(pk=slot.pk)
    for prev_slot in previous_slots:
        prev_slot.is_occupied = False
        prev_slot.bus = None
        prev_slot.is_blocked = False
        prev_slot.save(update_fields=["is_occupied", "bus", "is_blocked"])

    slot.bus = bus
    slot.is_occupied = True
    slot.save(update_fields=["bus", "is_occupied"])

    recompute_blocked_slots()

    ParkingEvent.objects.create(
        bus=bus,
        sensor=sensor,
        parking_slot=slot,
        event_type=event_type,
        message=f"{bus.bus_number} assigned to {slot.row}{slot.slot_number}",
    )
    return slot


@transaction.atomic
def free_slot(bus, sensor=None, event_type="EXIT"):
    """
    Clear every slot `bus` currently occupies. Idempotent: if the bus holds
    no slot, this is a no-op and returns an empty list (no duplicate EXIT
    events for a bus that already left).
    """
    from sensors.models import ParkingEvent

    slots = list(ParkingSlot.objects.select_for_update().filter(bus=bus))
    if not slots:
        return []

    for slot in slots:
        slot.is_occupied = False
        slot.bus = None
        slot.is_blocked = False
        slot.save(update_fields=["is_occupied", "bus", "is_blocked"])

    recompute_blocked_slots()

    for slot in slots:
        ParkingEvent.objects.create(
            bus=bus,
            sensor=sensor,
            parking_slot=slot,
            event_type=event_type,
            message=f"{bus.bus_number} left {slot.row}{slot.slot_number}",
        )
    return slots


@transaction.atomic
def set_occupancy(slot_id, is_occupied, sensor=None):
    """
    Ultrasonic-driven occupancy update for one slot. Raises SlotNotFound for
    an unknown slot_id instead of the old silent "pass" (plan item 4.2).

    Deliberately never touches slot.bus. A single "free" ultrasonic reading
    can be a glitch (someone walking past the sensor), so it must never by
    itself undo an RFID-confirmed bus assignment -- only assign_bus/free_slot
    above are allowed to change which bus, if any, holds a slot.
    """
    try:
        slot = ParkingSlot.objects.select_for_update().get(pk=slot_id)
    except ParkingSlot.DoesNotExist:
        raise SlotNotFound(f"No parking slot with id {slot_id}")

    if slot.is_occupied == is_occupied:
        return slot

    slot.is_occupied = is_occupied
    if not is_occupied and slot.bus_id is None:
        slot.is_blocked = False
        slot.save(update_fields=["is_occupied", "is_blocked"])
    else:
        slot.save(update_fields=["is_occupied"])

    recompute_blocked_slots()
    return slot
