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
    A driver may list, add, edit and delete students on their own bus only —
    never see, touch, or even detect the existence of another bus's roster.
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

    def test_driver_create_is_forced_onto_own_bus_even_if_another_bus_is_submitted(self):
        self.client.force_authenticate(self.driver1)
        res = self.client.post(self.url, {"name": "Carol", "roll_number": "C1", "bus": self.bus2.id}, format="json")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["bus"], self.bus1.id)

    def test_driver_without_a_linked_bus_cannot_add_students(self):
        lone_driver = make_user("driver3", "DRIVER")
        self.client.force_authenticate(lone_driver)
        res = self.client.post(self.url, {"name": "Dan", "roll_number": "D1"}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_driver_can_edit_own_student_but_not_move_them_to_another_bus(self):
        self.client.force_authenticate(self.driver1)
        res = self.client.patch(
            f"{self.url}{self.alice.id}/", {"phone": "9999999999", "bus": self.bus2.id}, format="json"
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["phone"], "9999999999")
        self.assertEqual(res.data["bus"], self.bus1.id)

    def test_driver_cannot_edit_other_bus_student(self):
        self.client.force_authenticate(self.driver1)
        res = self.client.patch(f"{self.url}{self.bob.id}/", {"phone": "111"}, format="json")
        self.assertEqual(res.status_code, 404)

    def test_driver_can_delete_own_student(self):
        self.client.force_authenticate(self.driver1)
        res = self.client.delete(f"{self.url}{self.alice.id}/")
        self.assertEqual(res.status_code, 204)
        self.assertFalse(Student.objects.filter(id=self.alice.id).exists())

    def test_driver_cannot_delete_other_bus_student(self):
        self.client.force_authenticate(self.driver1)
        res = self.client.delete(f"{self.url}{self.bob.id}/")
        self.assertEqual(res.status_code, 404)
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
