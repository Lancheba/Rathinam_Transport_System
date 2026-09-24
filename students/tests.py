from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from buses.models import Bus
from .models import Student

BUS_FIELDS = {
    "rfid_uid": "RFID-STU",
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


def make_bus(bus_number, driver=None):
    return Bus.objects.create(
        bus_number=bus_number, route=f"Route for {bus_number}", driver=driver,
        rfid_uid=f"{BUS_FIELDS['rfid_uid']}-{bus_number}",
        departure_time=BUS_FIELDS["departure_time"],
        length_m=BUS_FIELDS["length_m"], width_m=BUS_FIELDS["width_m"],
    )


class DriverOwnBusStudentTests(APITestCase):
    """
    A driver has read-only access to their own bus's roster: they can list it,
    but can never write to it, and never see or detect another bus's roster.
    """

    url = "/api/students/"

    def setUp(self):
        self.driver1 = make_user("driver1", "DRIVER")
        self.driver2 = make_user("driver2", "DRIVER")
        self.bus1 = make_bus("D01", driver=self.driver1)
        self.bus2 = make_bus("D02", driver=self.driver2)
        self.alice = Student.objects.create(name="Alice", roll_number="A1", bus=self.bus1)
        self.bob = Student.objects.create(name="Bob", roll_number="B1", bus=self.bus2)

    def test_driver_only_sees_own_bus_students(self):
        self.client.force_authenticate(self.driver1)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 200)
        self.assertEqual([s["name"] for s in res.data], ["Alice"])

    def test_driver_cannot_view_other_bus_student_by_id(self):
        self.client.force_authenticate(self.driver1)
        res = self.client.get(f"{self.url}{self.bob.id}/")
        self.assertEqual(res.status_code, 404)

    def test_driver_cannot_create_students(self):
        self.client.force_authenticate(self.driver1)
        res = self.client.post(self.url, {"name": "Carol", "roll_number": "C1", "bus": self.bus1.id}, format="json")
        self.assertEqual(res.status_code, 403)
        self.assertEqual(Student.objects.count(), 2)

    def test_driver_without_a_linked_bus_cannot_add_students(self):
        lone_driver = make_user("driver3", "DRIVER")
        self.client.force_authenticate(lone_driver)
        res = self.client.post(self.url, {"name": "Dan", "roll_number": "D1"}, format="json")
        self.assertEqual(res.status_code, 403)
        self.assertEqual(Student.objects.count(), 2)

    def test_driver_cannot_edit_own_student(self):
        self.client.force_authenticate(self.driver1)
        res = self.client.patch(f"{self.url}{self.alice.id}/", {"phone": "9999999999"}, format="json")
        self.assertEqual(res.status_code, 403)
        self.alice.refresh_from_db()
        self.assertNotEqual(self.alice.phone, "9999999999")

    def test_driver_cannot_edit_other_bus_student(self):
        self.client.force_authenticate(self.driver1)
        res = self.client.patch(f"{self.url}{self.bob.id}/", {"phone": "111"}, format="json")
        self.assertEqual(res.status_code, 403)
        self.bob.refresh_from_db()
        self.assertNotEqual(self.bob.phone, "111")

    def test_driver_cannot_delete_own_student(self):
        self.client.force_authenticate(self.driver1)
        res = self.client.delete(f"{self.url}{self.alice.id}/")
        self.assertEqual(res.status_code, 403)
        self.assertTrue(Student.objects.filter(id=self.alice.id).exists())

    def test_driver_cannot_delete_other_bus_student(self):
        self.client.force_authenticate(self.driver1)
        res = self.client.delete(f"{self.url}{self.bob.id}/")
        self.assertEqual(res.status_code, 403)
        self.assertTrue(Student.objects.filter(id=self.bob.id).exists())

    def test_all_bus_roster_view_stays_staff_only(self):
        self.client.force_authenticate(self.driver1)
        res = self.client.get(f"{self.url}roster/")
        self.assertEqual(res.status_code, 403)

    def test_unauthenticated_user_is_rejected(self):
        res = self.client.get(self.url)
        self.assertIn(res.status_code, (401, 403))

    def test_admin_still_has_full_cross_bus_access(self):
        admin = make_user("admin1", "ADMIN")
        self.client.force_authenticate(admin)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 2)


class MyStudentLinkTests(APITestCase):
    """A STUDENT-role account linking itself to its own roster row by roll number."""

    url = "/api/students/me/"

    def setUp(self):
        self.bus = make_bus("B10")
        self.alice = Student.objects.create(name="Alice", roll_number="R900", bus=self.bus)
        self.student_user = make_user("alice_login", "STUDENT")
        self.other_student_user = make_user("mallory_login", "STUDENT")
        self.driver = make_user("driver10", "DRIVER")

    def test_unlinked_account_gets_linked_false(self):
        self.client.force_authenticate(self.student_user)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data["linked"])
        self.assertIsNone(res.data["student"])

    def test_student_can_link_by_roll_number(self):
        self.client.force_authenticate(self.student_user)
        res = self.client.post(self.url, {"roll_number": "r900"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["linked"])
        self.assertEqual(res.data["student"]["roll_number"], "R900")
        self.alice.refresh_from_db()
        self.assertEqual(self.alice.linked_user_id, self.student_user.id)

    def test_unknown_roll_number_is_rejected(self):
        self.client.force_authenticate(self.student_user)
        res = self.client.post(self.url, {"roll_number": "NOPE"}, format="json")
        self.assertEqual(res.status_code, 404)

    def test_roll_number_already_linked_to_someone_else_is_rejected(self):
        self.alice.linked_user = self.other_student_user
        self.alice.save(update_fields=["linked_user"])
        self.client.force_authenticate(self.student_user)
        res = self.client.post(self.url, {"roll_number": "R900"}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_already_linked_account_cannot_link_again(self):
        self.alice.linked_user = self.student_user
        self.alice.save(update_fields=["linked_user"])
        self.client.force_authenticate(self.student_user)
        res = self.client.post(self.url, {"roll_number": "R900"}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_driver_role_cannot_use_student_self_link(self):
        self.client.force_authenticate(self.driver)
        res = self.client.post(self.url, {"roll_number": "R900"}, format="json")
        self.assertEqual(res.status_code, 403)

    def test_student_can_unlink(self):
        self.alice.linked_user = self.student_user
        self.alice.save(update_fields=["linked_user"])
        self.client.force_authenticate(self.student_user)
        res = self.client.delete(self.url)
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data["linked"])
        self.alice.refresh_from_db()
        self.assertIsNone(self.alice.linked_user_id)
