from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from parking.models import ParkingGround, ParkingSlot


def make_ground():
    return ParkingGround.objects.create(
        name="Main Ground", length_m="100.00", width_m="60.00",
        entrance_width_m="6.00", exit_width_m="6.00",
    )


def make_slot(ground, row="A", slot_number=1, **kw):
    return ParkingSlot.objects.create(
        ground=ground, row=row, slot_number=slot_number,
        x_position_m="1.00", y_position_m="1.00", **kw,
    )


def make_user(username, role=None, staff=False):
    user = User.objects.create_user(username, password="pass1234")
    user.is_staff = staff
    user.save(update_fields=["is_staff"])
    if role:
        user.profile.role = role
        user.profile.save()
    return user


class ParkingGroundViewSetTests(APITestCase):
    url = "/api/parking/ground/"

    def setUp(self):
        self.ground = make_ground()
        self.staff = make_user("pgstaff", staff=True)
        self.student = make_user("pgstudent", "STUDENT")

    def test_anyone_can_list_grounds(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)

    def test_non_staff_cannot_create_ground(self):
        self.client.force_authenticate(self.student)
        res = self.client.post(self.url, {
            "name": "New Ground", "length_m": "50.00", "width_m": "30.00",
            "entrance_width_m": "4.00", "exit_width_m": "4.00",
        })
        self.assertEqual(res.status_code, 403)

    def test_staff_can_create_ground(self):
        self.client.force_authenticate(self.staff)
        res = self.client.post(self.url, {
            "name": "New Ground", "length_m": "50.00", "width_m": "30.00",
            "entrance_width_m": "4.00", "exit_width_m": "4.00",
        })
        self.assertEqual(res.status_code, 201, res.data)


class ParkingSlotViewSetTests(APITestCase):
    url = "/api/parking/slots/"

    def setUp(self):
        self.ground = make_ground()
        make_slot(self.ground, row="A", slot_number=1, is_occupied=True)
        make_slot(self.ground, row="A", slot_number=2, is_blocked=True)
        make_slot(self.ground, row="B", slot_number=1)

    def test_anonymous_can_list_slots(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 3)

    def test_filter_by_row(self):
        res = self.client.get(self.url, {"row": "a"})
        self.assertEqual(len(res.data), 2)

    def test_filter_by_occupied(self):
        res = self.client.get(self.url, {"occupied": "true"})
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["slot_number"], 1)

    def test_filter_by_blocked(self):
        res = self.client.get(self.url, {"blocked": "true"})
        self.assertEqual(len(res.data), 1)
        self.assertTrue(res.data[0]["is_blocked"])


class ParkingSummaryTests(APITestCase):
    url = "/api/parking/summary/"

    def test_summary_with_no_slots(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["total_slots"], 0)
        self.assertEqual(res.data["utilisation_pct"], 0)

    def test_summary_computes_utilisation(self):
        ground = make_ground()
        make_slot(ground, row="A", slot_number=1, is_occupied=True)
        make_slot(ground, row="A", slot_number=2, is_blocked=True)
        make_slot(ground, row="B", slot_number=1)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["total_slots"], 3)
        self.assertEqual(res.data["occupied"], 1)
        self.assertEqual(res.data["blocked"], 1)
        self.assertEqual(res.data["free"], 2)
        self.assertAlmostEqual(res.data["utilisation_pct"], 33.3, places=1)
