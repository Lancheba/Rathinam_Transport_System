from datetime import time
from decimal import Decimal

from django.test import override_settings
from rest_framework.test import APITestCase

from accounts.models import Device
from buses.models import Bus
from parking.models import ParkingGround, ParkingSlot
from sensors.models import ParkingEvent, Sensor


def make_ground():
    ground = ParkingGround.objects.create(
        name="Test ground", length_m=50, width_m=20,
        entrance_width_m=6, exit_width_m=6, total_slots=0,
    )
    slots = {}
    for n in range(1, 3):
        slots[f"A{n}"] = ParkingSlot.objects.create(
            ground=ground, row="A", slot_number=n,
            x_position_m=Decimal(10 * n), y_position_m=Decimal(5),
        )
    return slots


def make_bus(number, uid):
    return Bus.objects.create(
        bus_number=number, rfid_uid=uid, route="R", departure_time=time(16, 0),
        length_m=Decimal("10.5"), width_m=Decimal("2.5"),
    )


@override_settings(VISION_STABLE_FRAMES=3, VISION_LINK_MIN_FRAMES=5,
                    VISION_MAX_SLOT_DISTANCE_M=4.0, VISION_ENTRY_WINDOW_MIN=15,
                    VISION_TRACK_TIMEOUT_S=30)
class RFIDEventTests(APITestCase):
    def setUp(self):
        self.slots = make_ground()
        self.bus = make_bus("B01", "AAAA0001")
        _, self.device_key = Device.generate("test device")
        self.sensor = Sensor.objects.create(sensor_id="RF-GATE", sensor_type="RFID", location="Gate")

    def post(self, path, data):
        return self.client.post(path, data, format="json", HTTP_X_DEVICE_KEY=self.device_key)

    def test_unknown_sensor_id_is_404(self):
        r = self.post("/api/sensors/rfid/", {"rfid_uid": "AAAA0001", "sensor_id": "GHOST", "event_type": "ENTRY"})
        self.assertEqual(r.status_code, 404)
        self.assertFalse(Sensor.objects.filter(sensor_id="GHOST").exists())

    def test_duplicate_entry_is_ignored(self):
        r1 = self.post("/api/sensors/rfid/", {"rfid_uid": "AAAA0001", "sensor_id": "RF-GATE", "event_type": "ENTRY"})
        r2 = self.post("/api/sensors/rfid/", {"rfid_uid": "AAAA0001", "sensor_id": "RF-GATE", "event_type": "ENTRY"})
        self.assertEqual(r1.status_code, 200)
        self.assertFalse(r1.data.get("duplicate"))
        self.assertEqual(r2.status_code, 200)
        self.assertTrue(r2.data.get("duplicate"))
        self.assertEqual(ParkingEvent.objects.filter(bus=self.bus, event_type="ENTRY").count(), 1)

    def test_exit_then_entry_is_not_duplicate(self):
        self.post("/api/sensors/rfid/", {"rfid_uid": "AAAA0001", "sensor_id": "RF-GATE", "event_type": "ENTRY"})
        self.post("/api/sensors/rfid/", {"rfid_uid": "AAAA0001", "sensor_id": "RF-GATE", "event_type": "EXIT"})
        r = self.post("/api/sensors/rfid/", {"rfid_uid": "AAAA0001", "sensor_id": "RF-GATE", "event_type": "ENTRY"})
        self.assertFalse(r.data.get("duplicate"))
        self.assertEqual(ParkingEvent.objects.filter(bus=self.bus, event_type="ENTRY").count(), 2)

    def test_parked_assigns_first_free_slot(self):
        r = self.post("/api/sensors/rfid/", {"rfid_uid": "AAAA0001", "sensor_id": "RF-GATE", "event_type": "PARKED"})
        self.assertEqual(r.data["slot"], "A1")
        self.slots["A1"].refresh_from_db()
        self.assertEqual(self.slots["A1"].bus, self.bus)

    def test_exit_frees_the_slot(self):
        self.post("/api/sensors/rfid/", {"rfid_uid": "AAAA0001", "sensor_id": "RF-GATE", "event_type": "PARKED"})
        self.post("/api/sensors/rfid/", {"rfid_uid": "AAAA0001", "sensor_id": "RF-GATE", "event_type": "EXIT"})
        self.slots["A1"].refresh_from_db()
        self.assertIsNone(self.slots["A1"].bus)
        self.assertFalse(self.slots["A1"].is_occupied)


@override_settings(VISION_STABLE_FRAMES=3, VISION_LINK_MIN_FRAMES=5,
                    VISION_MAX_SLOT_DISTANCE_M=4.0, VISION_ENTRY_WINDOW_MIN=15,
                    VISION_TRACK_TIMEOUT_S=30)
class OccupancyEventTests(APITestCase):
    def setUp(self):
        self.slots = make_ground()
        self.bus = make_bus("B01", "AAAA0001")
        _, self.device_key = Device.generate("test device")
        self.us_sensor = Sensor.objects.create(sensor_id="US-A1", sensor_type="ULTRASONIC", location="A1")

    def post(self, data):
        return self.client.post("/api/sensors/occupancy/", data, format="json", HTTP_X_DEVICE_KEY=self.device_key)

    def test_unknown_sensor_id_is_404(self):
        r = self.post({"sensor_id": "GHOST", "is_occupied": True})
        self.assertEqual(r.status_code, 404)

    def test_unknown_slot_id_is_404(self):
        r = self.post({"sensor_id": "US-A1", "is_occupied": True, "slot_id": 999999})
        self.assertEqual(r.status_code, 404)

    def test_single_free_reading_does_not_evict_the_bus(self):
        self.slots["A1"].bus = self.bus
        self.slots["A1"].is_occupied = True
        self.slots["A1"].save()

        r = self.post({"sensor_id": "US-A1", "is_occupied": False, "slot_id": self.slots["A1"].pk})
        self.assertEqual(r.status_code, 200)

        self.slots["A1"].refresh_from_db()
        self.assertEqual(self.slots["A1"].bus, self.bus)
        self.assertFalse(self.slots["A1"].is_occupied)
