from datetime import date, timedelta

from django.contrib.auth.models import User
from rest_framework import serializers
from rest_framework.test import APITestCase

from buses.models import Bus

from .models import AttendanceRecord, AttendanceSession, Teacher
from .serializers import (
    AttendanceRecordSerializer,
    AttendanceSubmitSerializer,
    TeacherSerializer,
)


def make_user(username, role=None):
    user = User.objects.create_user(username, password="pass1234")
    if role:
        user.profile.role = role
        user.profile.save()
    return user


def make_bus(bus_number):
    return Bus.objects.create(
        bus_number=bus_number, route=f"Route for {bus_number}",
        rfid_uid=f"RFID-ATTSER-{bus_number}", departure_time="08:00",
        length_m="10.00", width_m="2.50",
    )


class WindowConfigEveningOrderCoverageTests(APITestCase):
    url = "/api/attendance/window-config/"

    def test_evening_start_after_evening_end_is_rejected(self):
        admin = make_user("cov3_winadmin1", "ADMIN")
        self.client.force_authenticate(admin)
        res = self.client.patch(
            self.url, {"evening_start": "20:00:00", "evening_end": "19:00:00"}, format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("evening_end", res.data)


class TeacherSerializerCoverageTests(APITestCase):
    url = "/api/attendance/teachers/"

    def setUp(self):
        self.admin = make_user("cov3_admin1", "ADMIN")
        self.bus = make_bus("COV3T1")
        self.existing = Teacher.objects.create(name="Existing Teach", staff_id="ETC1", bus=self.bus)

    def test_blank_staff_id_rejected_via_method(self):
        serializer = TeacherSerializer()
        with self.assertRaises(serializers.ValidationError):
            serializer.validate_staff_id("   ")

    def test_duplicate_staff_id_rejected(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            self.url, {"name": "New Teach", "staff_id": "etc1", "bus": self.bus.id},
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("staff_id", res.data)

    def test_updating_own_staff_id_is_allowed(self):
        self.client.force_authenticate(self.admin)
        res = self.client.patch(f"{self.url}{self.existing.id}/", {"staff_id": "etc1"})
        self.assertEqual(res.status_code, 200)

    def test_blank_name_rejected_via_method(self):
        serializer = TeacherSerializer()
        with self.assertRaises(serializers.ValidationError):
            serializer.validate_name("   ")

    def test_create_with_login_success(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            self.url,
            {
                "name": "Login Teach", "staff_id": "LTC1", "bus": self.bus.id,
                "login_username": "loginteach1", "login_password": "S3curePass!23",
            },
        )
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.data["has_login"])

    def test_create_with_login_rejects_duplicate_username(self):
        make_user("dupeteachuser1")
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            self.url,
            {
                "name": "Dupe Teach", "staff_id": "LTC2", "bus": self.bus.id,
                "login_username": "dupeteachuser1", "login_password": "S3curePass!23",
            },
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("login_username", res.data)

    def test_create_with_login_rejects_weak_password(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            self.url,
            {
                "name": "Weak Teach", "staff_id": "LTC3", "bus": self.bus.id,
                "login_username": "weakteachuser1", "login_password": "123",
            },
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("login_password", res.data)


class AttendanceRecordSerializerCoverageTests(APITestCase):
    def test_get_identifier_returns_teacher_staff_id(self):
        bus = make_bus("COV3R1")
        teacher = Teacher.objects.create(name="Rec Teach", staff_id="RTC1", bus=bus)
        session = AttendanceSession.objects.create(bus=bus, date=date.today(), slot="MORNING")
        record = AttendanceRecord.objects.create(
            session=session, person_type="TEACHER", teacher=teacher, status="PRESENT",
        )
        data = AttendanceRecordSerializer(record).data
        self.assertEqual(data["identifier"], "RTC1")

    def test_get_identifier_returns_none_when_neither_linked(self):
        bus = make_bus("COV3R2")
        session = AttendanceSession.objects.create(bus=bus, date=date.today(), slot="MORNING")
        record = AttendanceRecord(session=session, person_type="STUDENT", status="PRESENT")
        self.assertIsNone(AttendanceRecordSerializer().get_identifier(record))


class AttendanceSubmitSerializerCoverageTests(APITestCase):
    def test_validate_raises_when_no_records_and_not_holiday(self):
        serializer = AttendanceSubmitSerializer(data={
            "date": str(date.today()), "is_holiday": False, "records": [],
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn("non_field_errors", serializer.errors)
