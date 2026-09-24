from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

LOGIN_URL = '/api/auth/login/'


def make_driver(username, bus=None):
    u = User.objects.create_user(username, password="StrongP@ss1")
    u.profile.role = "DRIVER"
    u.profile.save()
    if bus is not None:
        bus.driver = u
        bus.save(update_fields=["driver"])
    return u


def make_bus(number):
    from buses.models import Bus
    return Bus.objects.create(
        bus_number=number, route="Test route", rfid_uid=f"RFID-{number}",
        departure_time="08:00", length_m="10.00", width_m="2.50",
    )


class DriverLoginWithoutBusTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_driver_with_no_bus_can_log_in_without_cab_number(self):
        make_driver("drv31a")
        r = self.client.post(
            LOGIN_URL, {"username": "drv31a", "password": "StrongP@ss1"}, format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)

    def test_driver_with_no_bus_can_log_in_even_with_a_cab_number_sent(self):
        make_driver("drv31b")
        r = self.client.post(
            LOGIN_URL,
            {"username": "drv31b", "password": "StrongP@ss1", "cab_number": "anything"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)

    def test_driver_with_a_bus_still_needs_correct_cab_number(self):
        bus = make_bus("D31")
        make_driver("drv31c", bus=bus)
        r = self.client.post(
            LOGIN_URL, {"username": "drv31c", "password": "StrongP@ss1"}, format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cab_number", r.data)

    def test_driver_with_a_bus_and_wrong_cab_number_is_rejected(self):
        bus = make_bus("D31X")
        make_driver("drv31d", bus=bus)
        r = self.client.post(
            LOGIN_URL,
            {"username": "drv31d", "password": "StrongP@ss1", "cab_number": "WRONG"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_driver_with_a_bus_and_correct_cab_number_logs_in(self):
        bus = make_bus("D31Y")
        make_driver("drv31e", bus=bus)
        r = self.client.post(
            LOGIN_URL,
            {"username": "drv31e", "password": "StrongP@ss1", "cab_number": "D31Y"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
