from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from buses.models import Bus
from parking.models import ParkingGround, ParkingSlot
from parking.services import ParkingError, SlotNotFound, SlotUnavailable, assign_bus, free_slot, set_occupancy
from sensors.models import ParkingEvent


def make_ground():
    return ParkingGround.objects.create(
        name="Svc Ground", length_m="100.00", width_m="60.00",
        entrance_width_m="6.00", exit_width_m="6.00",
    )


def make_slot(ground, row="A", slot_number=1, **kw):
    return ParkingSlot.objects.create(
        ground=ground, row=row, slot_number=slot_number,
        x_position_m="1.00", y_position_m="1.00", **kw,
    )


def make_bus(bus_number):
    return Bus.objects.create(
        bus_number=bus_number, route=f"Route {bus_number}", rfid_uid=f"RFID-{bus_number}",
        departure_time="08:00", length_m="10.00", width_m="2.50",
    )


class AssignBusTests(APITestCase):
    def setUp(self):
        self.ground = make_ground()
        self.bus1 = make_bus("SVC1")
        self.bus2 = make_bus("SVC2")

    def test_assign_to_specific_free_slot(self):
        slot = make_slot(self.ground, row="A", slot_number=1)
        result = assign_bus(self.bus1, slot=slot)
        slot.refresh_from_db()
        self.assertEqual(result.pk, slot.pk)
        self.assertTrue(slot.is_occupied)
        self.assertEqual(slot.bus_id, self.bus1.pk)
        self.assertEqual(ParkingEvent.objects.filter(bus=self.bus1, event_type="PARKED").count(), 1)

    def test_assign_to_occupied_slot_by_another_bus_raises(self):
        slot = make_slot(self.ground, row="A", slot_number=1)
        assign_bus(self.bus1, slot=slot)
        with self.assertRaises(SlotUnavailable):
            assign_bus(self.bus2, slot=slot)

    def test_reassigning_same_bus_to_same_slot_is_idempotent(self):
        slot = make_slot(self.ground, row="A", slot_number=1)
        assign_bus(self.bus1, slot=slot)
        assign_bus(self.bus1, slot=slot)
        self.assertEqual(ParkingEvent.objects.filter(bus=self.bus1, event_type="PARKED").count(), 1)

    def test_assign_without_slot_picks_first_free_in_order(self):
        make_slot(self.ground, row="B", slot_number=1)
        first = make_slot(self.ground, row="A", slot_number=1)
        result = assign_bus(self.bus1)
        self.assertEqual(result.pk, first.pk)

    def test_assign_without_slot_when_none_free_returns_none(self):
        result = assign_bus(self.bus1)
        self.assertIsNone(result)

    def test_moving_bus_clears_previous_slot(self):
        slot_a = make_slot(self.ground, row="A", slot_number=1)
        slot_b = make_slot(self.ground, row="B", slot_number=1)
        assign_bus(self.bus1, slot=slot_a)
        assign_bus(self.bus1, slot=slot_b)
        slot_a.refresh_from_db()
        slot_b.refresh_from_db()
        self.assertFalse(slot_a.is_occupied)
        self.assertIsNone(slot_a.bus_id)
        self.assertTrue(slot_b.is_occupied)
        self.assertEqual(slot_b.bus_id, self.bus1.pk)


class FreeSlotTests(APITestCase):
    def setUp(self):
        self.ground = make_ground()
        self.bus = make_bus("SVC3")

    def test_free_slot_clears_occupancy_and_logs_exit(self):
        slot = make_slot(self.ground, row="A", slot_number=1)
        assign_bus(self.bus, slot=slot)
        freed = free_slot(self.bus)
        slot.refresh_from_db()
        self.assertEqual(len(freed), 1)
        self.assertFalse(slot.is_occupied)
        self.assertIsNone(slot.bus_id)
        self.assertEqual(ParkingEvent.objects.filter(bus=self.bus, event_type="EXIT").count(), 1)

    def test_freeing_a_bus_with_no_slot_is_a_noop(self):
        result = free_slot(self.bus)
        self.assertEqual(result, [])
        self.assertEqual(ParkingEvent.objects.filter(bus=self.bus, event_type="EXIT").count(), 0)


class SetOccupancyTests(APITestCase):
    def setUp(self):
        self.ground = make_ground()

    def test_unknown_slot_raises_not_found(self):
        with self.assertRaises(SlotNotFound):
            set_occupancy(999999, True)

    def test_toggle_occupied_true(self):
        slot = make_slot(self.ground, row="A", slot_number=1)
        result = set_occupancy(slot.pk, True)
        self.assertTrue(result.is_occupied)

    def test_toggle_to_same_value_is_noop(self):
        slot = make_slot(self.ground, row="A", slot_number=1, is_occupied=True)
        result = set_occupancy(slot.pk, True)
        self.assertEqual(result.pk, slot.pk)

    def test_freeing_unassigned_slot_clears_blocked(self):
        slot = make_slot(self.ground, row="A", slot_number=1, is_occupied=True, is_blocked=True)
        result = set_occupancy(slot.pk, False)
        self.assertFalse(result.is_occupied)
        self.assertFalse(result.is_blocked)
