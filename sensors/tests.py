from io import StringIO

from django.core.management import CommandError, call_command
from django.test import TestCase

from buses.models import Bus
from parking.models import ParkingGround, ParkingSlot
from sensors.models import Sensor
from vision.models import VisionTrack


class SeedSensorsTests(TestCase):
    def setUp(self):
        ground = ParkingGround.objects.create(
            name="Test", length_m=60, width_m=35, entrance_width_m=8, exit_width_m=8, total_slots=4,
        )
        self.slots = [
            ParkingSlot.objects.create(
                ground=ground, row="A", slot_number=n, x_position_m=n * 5, y_position_m=10,
            )
            for n in range(1, 5)
        ]

    def run_cmd(self, *args):
        call_command("seed_sensors", *args, stdout=StringIO())

    def test_requires_slots(self):
        ParkingSlot.objects.all().delete()
        with self.assertRaises(CommandError):
            self.run_cmd()

    def test_creates_gates_slot_sensors_and_camera(self):
        self.run_cmd()
        self.assertEqual(Sensor.objects.filter(sensor_type="RFID").count(), 2)
        self.assertEqual(Sensor.objects.filter(sensor_type="ULTRASONIC").count(), 4)
        self.assertEqual(Sensor.objects.filter(sensor_type="CAMERA").count(), 1)

    def test_rerun_does_not_duplicate(self):
        self.run_cmd()
        self.run_cmd()
        self.assertEqual(Sensor.objects.count(), 7)

    def test_camera_tracks_only_for_parked_buses(self):
        bus = Bus.objects.create(
            bus_number="B1", rfid_uid="U1", route="R", departure_time="08:00", length_m=10, width_m=2.5,
        )
        slot = self.slots[0]
        slot.bus, slot.is_occupied = bus, True
        slot.save()
        self.run_cmd()
        self.assertEqual(VisionTrack.objects.count(), 1)
        self.assertEqual(VisionTrack.objects.get().bus, bus)
        self.assertEqual(Sensor.objects.get(sensor_id="US-A1").last_reading, "occupied")

    def test_offline_and_clear(self):
        self.run_cmd("--offline", "3")
        self.assertEqual(Sensor.objects.filter(is_active=False).count(), 3)
        self.run_cmd("--clear")
        self.assertEqual(Sensor.objects.count(), 0)
        self.assertEqual(VisionTrack.objects.count(), 0)
