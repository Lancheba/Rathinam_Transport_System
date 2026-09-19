from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from .models import Bus

PAYLOAD = {
    "bus_number": "B09",
    "rfid_uid": "RFID-009",
    "route": "Route 9 - Tech Park",
    "departure_time": "08:15",
    "length_m": "12.00",
    "width_m": "2.50",
    "is_active": True,
}


def make_user(username, role=None, **extra):
    user = User.objects.create_user(username, password="pass1234", **extra)
    if role:
        user.profile.role = role
        user.profile.save()
    return user


class AddBusPermissionTests(APITestCase):
    url = "/api/buses/"

    def test_admin_role_can_add_bus(self):
        self.client.force_authenticate(make_user("adm", "ADMIN"))
        res = self.client.post(self.url, PAYLOAD, format="json")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertTrue(Bus.objects.filter(bus_number="B09").exists())

    def test_staff_role_can_add_bus(self):
        self.client.force_authenticate(make_user("stf", "STAFF"))
        res = self.client.post(self.url, PAYLOAD, format="json")
        self.assertEqual(res.status_code, 201, res.data)

    def test_superuser_with_default_role_can_add_bus(self):
        # createsuperuser leaves the profile role as STUDENT
        root = User.objects.create_superuser("root", "r@x.com", "pass1234")
        self.assertEqual(root.profile.role, "STUDENT")
        self.client.force_authenticate(root)
        self.assertEqual(self.client.post(self.url, PAYLOAD, format="json").status_code, 201)

    def test_student_cannot_add_bus(self):
        self.client.force_authenticate(make_user("stu", "STUDENT"))
        res = self.client.post(self.url, PAYLOAD, format="json")
        self.assertEqual(res.status_code, 403)
        self.assertFalse(Bus.objects.exists())

    def test_anonymous_cannot_add_bus(self):
        res = self.client.post(self.url, PAYLOAD, format="json")
        self.assertEqual(res.status_code, 401)

    def test_student_cannot_delete_bus(self):
        bus = Bus.objects.create(**{**PAYLOAD, "length_m": 12, "width_m": 2.5})
        self.client.force_authenticate(make_user("stu", "STUDENT"))
        self.assertEqual(self.client.delete(f"{self.url}{bus.id}/").status_code, 403)

    def test_anyone_can_list_buses(self):
        self.assertEqual(self.client.get(self.url).status_code, 200)

    def test_me_reports_can_manage_buses(self):
        for username, role, expected in [("a", "ADMIN", True), ("s", "STAFF", True), ("t", "STUDENT", False)]:
            self.client.force_authenticate(make_user(username, role))
            res = self.client.get("/api/auth/me/")
            self.assertEqual(res.data["can_manage_buses"], expected, username)
            self.assertEqual(res.data["role"], role)


class AddBusValidationTests(APITestCase):
    url = "/api/buses/"

    def setUp(self):
        self.client.force_authenticate(make_user("adm", "ADMIN"))

    def test_bus_number_is_normalised(self):
        res = self.client.post(self.url, {**PAYLOAD, "bus_number": "  b09 "}, format="json")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["bus_number"], "B09")

    def test_exact_duplicate_bus_number_gets_friendly_message(self):
        self.client.post(self.url, PAYLOAD, format="json")
        res = self.client.post(self.url, {**PAYLOAD, "rfid_uid": "OTHER"}, format="json")
        self.assertEqual(str(res.data["bus_number"][0]), "A bus with this number already exists.")

    def test_duplicate_bus_number_is_rejected_case_insensitively(self):
        self.client.post(self.url, PAYLOAD, format="json")
        res = self.client.post(self.url, {**PAYLOAD, "bus_number": "b09", "rfid_uid": "OTHER"}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("bus_number", res.data)

    def test_duplicate_rfid_is_rejected(self):
        self.client.post(self.url, PAYLOAD, format="json")
        res = self.client.post(self.url, {**PAYLOAD, "bus_number": "B10"}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(str(res.data["rfid_uid"][0]), "This RFID tag is already assigned to another bus.")

    def test_rfid_case_is_preserved(self):
        res = self.client.post(self.url, {**PAYLOAD, "rfid_uid": " aB12cd "}, format="json")
        self.assertEqual(res.data["rfid_uid"], "aB12cd")

    def test_bad_dimensions_are_rejected(self):
        for field, value in [("length_m", "0"), ("width_m", "-2"), ("length_m", "1000")]:
            res = self.client.post(self.url, {**PAYLOAD, field: value}, format="json")
            self.assertEqual(res.status_code, 400, (field, value))
            self.assertIn(field, res.data)

    def test_missing_fields_are_reported_per_field(self):
        res = self.client.post(self.url, {"bus_number": "B11"}, format="json")
        self.assertEqual(res.status_code, 400)
        for field in ("rfid_uid", "route", "departure_time", "length_m", "width_m"):
            self.assertIn(field, res.data)

    def test_editing_a_bus_keeps_its_own_number(self):
        bus_id = self.client.post(self.url, PAYLOAD, format="json").data["id"]
        res = self.client.patch(f"{self.url}{bus_id}/", {"route": "New route"}, format="json")
        self.assertEqual(res.status_code, 200, res.data)
