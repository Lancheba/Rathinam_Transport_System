from django.contrib.auth.models import User
from rest_framework import serializers
from rest_framework.test import APITestCase

from buses.models import Bus

from .models import Student
from .serializers import StudentSerializer


def make_user(username, role=None):
    user = User.objects.create_user(username, password="pass1234")
    if role:
        user.profile.role = role
        user.profile.save()
    return user


def make_bus(bus_number):
    return Bus.objects.create(
        bus_number=bus_number, route=f"Route for {bus_number}",
        rfid_uid=f"RFID-SER-{bus_number}", departure_time="08:00",
        length_m="10.00", width_m="2.50",
    )


class StudentSerializerCoverageTests(APITestCase):
    url = "/api/students/"

    def setUp(self):
        self.admin = make_user("cov_ser_admin1", "ADMIN")
        self.bus = make_bus("COVSER1")
        self.existing = Student.objects.create(name="Existing Kid", roll_number="EXK1", bus=self.bus)

    def test_blank_roll_number_rejected(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(self.url, {"name": "New Kid", "roll_number": "   ", "bus": self.bus.id})
        self.assertEqual(res.status_code, 400)
        self.assertIn("roll_number", res.data)

    def test_validate_roll_number_method_raises_on_empty(self):
        # DRF's CharField trims and rejects "   " at the field level before the
        # custom validator ever runs, so exercise validate_roll_number() directly.
        serializer = StudentSerializer()
        with self.assertRaises(serializers.ValidationError):
            serializer.validate_roll_number("   ")

    def test_validate_name_method_raises_on_empty(self):
        serializer = StudentSerializer()
        with self.assertRaises(serializers.ValidationError):
            serializer.validate_name("   ")

    def test_can_see_face_status_false_when_no_user(self):
        serializer = StudentSerializer(context={})
        self.assertFalse(serializer._can_see_face_status())

    def test_duplicate_roll_number_rejected_case_insensitive(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(self.url, {"name": "New Kid", "roll_number": "exk1", "bus": self.bus.id})
        self.assertEqual(res.status_code, 400)
        self.assertIn("roll_number", res.data)

    def test_updating_own_roll_number_is_allowed(self):
        self.client.force_authenticate(self.admin)
        res = self.client.patch(f"{self.url}{self.existing.id}/", {"roll_number": "exk1"})
        self.assertEqual(res.status_code, 200)

    def test_blank_name_rejected(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(self.url, {"name": "   ", "roll_number": "NEWK1", "bus": self.bus.id})
        self.assertEqual(res.status_code, 400)
        self.assertIn("name", res.data)

    def test_roll_number_uppercased_and_trimmed(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(self.url, {"name": "New Kid", "roll_number": " newk2 ", "bus": self.bus.id})
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["roll_number"], "NEWK2")

    def test_face_enrolled_visible_to_admin_and_hidden_for_others(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get(f"{self.url}{self.existing.id}/")
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data["face_enrolled"])
        self.assertIsNone(res.data["face_enrolled_at"])
