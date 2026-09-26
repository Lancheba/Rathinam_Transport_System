from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from buses.models import Bus
from students.models import Student

from .models import Teacher

BUS_FIELDS = {
    "rfid_uid": "RFID-COV",
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


def make_bus(bus_number, **overrides):
    fields = {
        "bus_number": bus_number,
        "route": f"Route for {bus_number}",
        "rfid_uid": f"{BUS_FIELDS['rfid_uid']}-{bus_number}",
        "departure_time": BUS_FIELDS["departure_time"],
        "length_m": BUS_FIELDS["length_m"],
        "width_m": BUS_FIELDS["width_m"],
    }
    fields.update(overrides)
    return Bus.objects.create(**fields)


class TeacherViewSetCoverageTests(APITestCase):
    url = "/api/attendance/teachers/"

    def setUp(self):
        self.admin = make_user("cov_admin1", "ADMIN")
        self.bus_a = make_bus("COVA1")
        self.bus_b = make_bus("COVA2")
        self.t1 = Teacher.objects.create(name="T One", staff_id="ST-COV1", bus=self.bus_a)
        self.t2 = Teacher.objects.create(name="T Two", staff_id="ST-COV2", bus=self.bus_b)

    def test_filter_by_bus_query_param(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get(self.url, {"bus": self.bus_a.id})
        self.assertEqual(res.status_code, 200)
        ids = [row["id"] for row in res.data]
        self.assertIn(self.t1.id, ids)
        self.assertNotIn(self.t2.id, ids)

    def test_create_login_success(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            f"{self.url}{self.t1.id}/create-login/",
            {"username": "newteacher1", "password": "S3curePass!23"},
        )
        self.assertEqual(res.status_code, 200)
        self.t1.refresh_from_db()
        self.assertIsNotNone(self.t1.linked_user_id)

    def test_create_login_rejects_duplicate_username(self):
        make_user("dupeuser1")
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            f"{self.url}{self.t1.id}/create-login/",
            {"username": "dupeuser1", "password": "S3curePass!23"},
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("username", res.data)

    def test_create_login_rejects_weak_password(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            f"{self.url}{self.t1.id}/create-login/",
            {"username": "weakpwteacher", "password": "123"},
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("password", res.data)


class DriverBusViewCoverageTests(APITestCase):
    url = "/api/attendance/my-bus/"

    def setUp(self):
        self.driver = make_user("cov_driver1", "DRIVER")
        self.other_driver = make_user("cov_driver2", "DRIVER")
        self.bus = make_bus("COVDR1")
        self.other_bus = make_bus("COVDR2")

    def test_get_returns_null_when_unlinked(self):
        self.client.force_authenticate(self.driver)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(res.data["bus"])

    def test_get_returns_linked_bus(self):
        self.bus.driver = self.driver
        self.bus.save(update_fields=["driver"])
        self.client.force_authenticate(self.driver)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["bus"]["id"], self.bus.id)

    def test_post_requires_bus_number(self):
        self.client.force_authenticate(self.driver)
        res = self.client.post(self.url, {"bus_number": ""})
        self.assertEqual(res.status_code, 400)
        self.assertIn("bus_number", res.data)

    def test_post_unknown_bus_number(self):
        self.client.force_authenticate(self.driver)
        res = self.client.post(self.url, {"bus_number": "NOPE-999"})
        self.assertEqual(res.status_code, 404)

    def test_post_bus_already_linked_to_other_driver(self):
        self.bus.driver = self.other_driver
        self.bus.save(update_fields=["driver"])
        self.client.force_authenticate(self.driver)
        res = self.client.post(self.url, {"bus_number": self.bus.bus_number})
        self.assertEqual(res.status_code, 400)

    def test_post_claims_bus_and_releases_previous(self):
        self.bus.driver = self.driver
        self.bus.save(update_fields=["driver"])
        self.client.force_authenticate(self.driver)
        res = self.client.post(
            self.url,
            {"bus_number": self.other_bus.bus_number, "student_capacity": 40, "teacher_capacity": 3},
        )
        self.assertEqual(res.status_code, 200)
        self.bus.refresh_from_db()
        self.other_bus.refresh_from_db()
        self.assertIsNone(self.bus.driver_id)
        self.assertEqual(self.other_bus.driver_id, self.driver.id)
        self.assertEqual(self.other_bus.student_capacity, 40)

    def test_patch_without_bus_returns_400(self):
        self.client.force_authenticate(self.driver)
        res = self.client.patch(self.url, {"student_capacity": 10})
        self.assertEqual(res.status_code, 400)

    def test_patch_updates_capacity(self):
        self.bus.driver = self.driver
        self.bus.save(update_fields=["driver"])
        self.client.force_authenticate(self.driver)
        res = self.client.patch(self.url, {"student_capacity": 25, "teacher_capacity": "bad"})
        self.assertEqual(res.status_code, 200)
        self.bus.refresh_from_db()
        self.assertEqual(self.bus.student_capacity, 25)


class AttendanceRosterCoverageTests(APITestCase):
    url = "/api/attendance/roster/"

    def setUp(self):
        self.admin = make_user("cov_admin2", "ADMIN")
        self.student_user = make_user("cov_student1", "STUDENT")
        self.bus = make_bus("COVR1")
        Student.objects.create(name="Roster Kid", roll_number="RK1", bus=self.bus)

    def test_no_bus_query_param_for_staff_returns_400(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 400)

    def test_unknown_bus_id_returns_404(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get(self.url, {"bus": 999999})
        self.assertEqual(res.status_code, 404)

    def test_non_driver_non_staff_forbidden(self):
        self.client.force_authenticate(self.student_user)
        res = self.client.get(self.url, {"bus": self.bus.id})
        self.assertEqual(res.status_code, 403)

    def test_invalid_slot_returns_400(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get(self.url, {"bus": self.bus.id, "slot": "NOON"})
        self.assertEqual(res.status_code, 400)

    def test_valid_roster_returns_students(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get(self.url, {"bus": self.bus.id, "slot": "MORNING"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["bus_id"], self.bus.id)
        self.assertFalse(res.data["already_marked"])
        self.assertEqual(len(res.data["students"]), 1)