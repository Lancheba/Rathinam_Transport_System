from datetime import date, timedelta

from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from buses.models import Bus
from students.models import Student

from .models import AttendanceRecord, AttendanceSession

BUS_FIELDS = {
    "rfid_uid": "RFID-ATT",
    "departure_time": "08:00",
    "length_m": "10.00",
    "width_m": "2.50",
}


def make_user(username, role=None):
    user = User.objects.create_user(username, password="pass1234")
    if role:
        user.profile.role = role
        user.profile.save()
    return user


def make_bus(bus_number):
    return Bus.objects.create(
        bus_number=bus_number, route=f"Route for {bus_number}",
        rfid_uid=f"{BUS_FIELDS['rfid_uid']}-{bus_number}",
        departure_time=BUS_FIELDS["departure_time"],
        length_m=BUS_FIELDS["length_m"], width_m=BUS_FIELDS["width_m"],
    )


class MyAttendanceTests(APITestCase):
    url = "/api/attendance/my/"

    def setUp(self):
        self.bus = make_bus("B20")
        self.alice = Student.objects.create(name="Alice", roll_number="R950", bus=self.bus)
        self.student_user = make_user("alice_att", "STUDENT")
        self.unlinked_user = make_user("bob_att", "STUDENT")
        self.driver = make_user("driver20", "DRIVER")
        self.today = date.today()

    def _link(self):
        self.alice.linked_user = self.student_user
        self.alice.save(update_fields=["linked_user"])

    def test_unlinked_student_gets_linked_false(self):
        self.client.force_authenticate(self.unlinked_user)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data["linked"])

    def test_driver_cannot_call_this_endpoint(self):
        self.client.force_authenticate(self.driver)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 403)

    def test_absent_today_is_reported(self):
        self._link()
        session = AttendanceSession.objects.create(bus=self.bus, date=self.today)
        AttendanceRecord.objects.create(
            session=session, person_type="STUDENT", student=self.alice, status="ABSENT",
        )
        self.client.force_authenticate(self.student_user)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["linked"])
        self.assertEqual(res.data["today"]["status"], "ABSENT")
        self.assertTrue(res.data["today"]["marked"])

    def test_present_today_is_reported(self):
        self._link()
        session = AttendanceSession.objects.create(bus=self.bus, date=self.today)
        AttendanceRecord.objects.create(
            session=session, person_type="STUDENT", student=self.alice, status="PRESENT",
        )
        self.client.force_authenticate(self.student_user)
        res = self.client.get(self.url)
        self.assertEqual(res.data["today"]["status"], "PRESENT")

    def test_holiday_today_is_reported(self):
        self._link()
        AttendanceSession.objects.create(
            bus=self.bus, date=self.today, is_holiday=True, holiday_reason="College holiday",
        )
        self.client.force_authenticate(self.student_user)
        res = self.client.get(self.url)
        self.assertTrue(res.data["today"]["is_holiday"])
        self.assertEqual(res.data["today"]["holiday_reason"], "College holiday")
        self.assertIsNone(res.data["today"]["status"])

    def test_no_session_yet_is_unmarked_not_absent(self):
        self._link()
        self.client.force_authenticate(self.student_user)
        res = self.client.get(self.url)
        self.assertFalse(res.data["today"]["marked"])
        self.assertIsNone(res.data["today"]["status"])

    def test_student_with_no_bus_gets_unmarked_days(self):
        self.alice.bus = None
        self.alice.save(update_fields=["bus"])
        self._link()
        self.client.force_authenticate(self.student_user)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(res.data["bus_number"])
        self.assertFalse(res.data["today"]["marked"])

    def test_recent_history_has_seven_days(self):
        self._link()
        self.client.force_authenticate(self.student_user)
        res = self.client.get(self.url)
        self.assertEqual(len(res.data["recent"]), 7)
        self.assertEqual(res.data["recent"][0]["date"], str(self.today))
