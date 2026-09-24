from datetime import time
from decimal import Decimal

from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from buses.models import Bus
from sensors.models import ParkingEvent, Sensor

UID = "RFID-SECRET-777"
PHONE = "9876543210"


def make_user(username, role=None):
    user = User.objects.create_user(username, password="pass1234")
    if role:
        user.profile.role = role
        user.profile.save()
    return user


class PublicDataLockdownTests(APITestCase):
    """Audit item 1.5: anonymous users and students must not see RFID UIDs or phone numbers."""

    def setUp(self):
        driver = make_user("drv", "DRIVER")
        driver.profile.phone = PHONE
        driver.profile.save()
        self.bus = Bus.objects.create(
            bus_number="B04", rfid_uid=UID, route="Route 4", departure_time=time(16, 0),
            length_m=Decimal("10.5"), width_m=Decimal("2.5"), driver=driver,
        )
        self.rfid_sensor = Sensor.objects.create(
            sensor_id="GATE-1", sensor_type="RFID", location="Gate", last_reading=UID,
        )
        self.event = ParkingEvent.objects.create(
            bus=self.bus, sensor=self.rfid_sensor, event_type="ENTRY",
            message=f"RFID {UID} detected - ENTRY",
        )
        self.student = make_user("stu", "STUDENT")
        self.staff = make_user("stf", "STAFF")

    def assertNoSecrets(self, response):
        body = response.content.decode()
        self.assertNotIn(UID, body)
        self.assertNotIn(PHONE, body)
        self.assertNotIn("rfid_uid", body)
        self.assertNotIn("driver_phone", body)
        self.assertNotIn("driver_username", body)

    # --- buses ---
    def test_anonymous_bus_list_has_no_rfid_or_phone(self):
        r = self.client.get("/api/buses/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data[0]["bus_number"], "B04")
        self.assertNoSecrets(r)

    def test_anonymous_bus_detail_has_no_rfid_or_phone(self):
        r = self.client.get(f"/api/buses/{self.bus.pk}/")
        self.assertEqual(r.status_code, 200)
        self.assertNoSecrets(r)

    def test_student_bus_list_and_search_have_no_secrets(self):
        self.client.force_authenticate(self.student)
        self.assertNoSecrets(self.client.get("/api/buses/"))
        r = self.client.get("/api/buses/search/?q=B04")
        self.assertEqual(r.status_code, 200)
        self.assertNoSecrets(r)

    def test_rfid_uid_is_not_searchable_by_non_staff(self):
        r = self.client.get(f"/api/buses/?search={UID}")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 0)

    def test_staff_still_see_everything(self):
        self.client.force_authenticate(self.staff)
        r = self.client.get("/api/buses/")
        self.assertEqual(r.data[0]["rfid_uid"], UID)
        self.assertEqual(r.data[0]["driver_phone"], PHONE)
        self.assertEqual(r.data[0]["driver_username"], "drv")
        self.assertEqual(len(self.client.get(f"/api/buses/?search={UID}").data), 1)

    # --- sensors ---
    def test_sensors_require_login(self):
        self.assertEqual(self.client.get("/api/sensors/").status_code, 401)
        self.assertEqual(self.client.get(f"/api/sensors/{self.rfid_sensor.pk}/").status_code, 401)

    def test_student_sees_sensors_but_not_rfid_readings(self):
        self.client.force_authenticate(self.student)
        r = self.client.get("/api/sensors/")
        self.assertEqual(r.status_code, 200)
        self.assertIsNone(r.data[0]["last_reading"])
        self.assertNotIn(UID, r.content.decode())

    def test_staff_see_rfid_readings(self):
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.get("/api/sensors/").data[0]["last_reading"], UID)

    # --- events ---
    def test_events_require_login(self):
        self.assertEqual(self.client.get("/api/events/").status_code, 401)

    def test_student_event_message_hides_rfid_uid(self):
        self.client.force_authenticate(self.student)
        r = self.client.get("/api/events/")
        self.assertEqual(r.status_code, 200)
        self.assertNotIn(UID, r.content.decode())
        self.assertIn("B04", r.data[0]["message"])

    def test_staff_see_full_event_message(self):
        self.client.force_authenticate(self.staff)
        self.assertIn(UID, self.client.get("/api/events/").data[0]["message"])

    # --- camera tracks ---
    def test_vision_tracks_require_login(self):
        self.assertEqual(self.client.get("/api/vision/tracks/").status_code, 401)
