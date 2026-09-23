from datetime import date, timedelta

from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from buses.models import Bus
from .models import MaintenanceLog

BUS_FIELDS = {"departure_time": "08:00", "length_m": "10.00", "width_m": "2.50"}


def make_user(username, role=None):
    user = User.objects.create_user(username, password="pass1234")
    if role:
        user.profile.role = role
        user.profile.save()
    return user


def make_bus(bus_number, driver=None):
    return Bus.objects.create(
        bus_number=bus_number, route=f"Route for {bus_number}", driver=driver,
        rfid_uid=f"RFID-{bus_number}", **BUS_FIELDS,
    )


class MaintenanceLogTests(APITestCase):
    url = "/api/maintenance/logs/"

    def setUp(self):
        self.driver1 = make_user("mdriver1", "DRIVER")
        self.driver2 = make_user("mdriver2", "DRIVER")
        self.bus1 = make_bus("M01", driver=self.driver1)
        self.bus2 = make_bus("M02", driver=self.driver2)
        self.log1 = MaintenanceLog.objects.create(
            bus=self.bus1, log_type=MaintenanceLog.SERVICE, date=date.today() - timedelta(days=10),
            odometer_km=12000, cost="1500.00", notes="Oil change",
        )
        self.log2 = MaintenanceLog.objects.create(
            bus=self.bus2, log_type=MaintenanceLog.FUEL, date=date.today() - timedelta(days=1),
            odometer_km=8000, cost="2000.00", fuel_liters="40.5",
        )

    def test_driver_only_sees_own_bus_logs(self):
        self.client.force_authenticate(self.driver1)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 200)
        self.assertEqual([r["id"] for r in res.data], [self.log1.id])

    def test_driver_cannot_view_other_bus_log_by_id(self):
        self.client.force_authenticate(self.driver1)
        res = self.client.get(f"{self.url}{self.log2.id}/")
        self.assertEqual(res.status_code, 404)

    def test_driver_create_is_forced_onto_own_bus(self):
        self.client.force_authenticate(self.driver1)
        res = self.client.post(self.url, {
            "bus": self.bus2.id, "log_type": "SERVICE", "date": str(date.today()),
            "odometer_km": 12500, "cost": "500.00", "notes": "Brake check",
        }, format="json")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["bus"], self.bus1.id)
        self.assertEqual(res.data["logged_by_username"], "mdriver1")

    def test_fuel_liters_cleared_on_service_entries(self):
        self.client.force_authenticate(self.driver1)
        res = self.client.post(self.url, {
            "log_type": "SERVICE", "date": str(date.today()), "fuel_liters": "30.0",
        }, format="json")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertIsNone(res.data["fuel_liters"])

    def test_future_date_is_rejected(self):
        self.client.force_authenticate(self.driver1)
        res = self.client.post(self.url, {
            "log_type": "FUEL", "date": str(date.today() + timedelta(days=1)), "fuel_liters": "20",
        }, format="json")
        self.assertEqual(res.status_code, 400)

    def test_driver_without_a_linked_bus_cannot_add_entries(self):
        lone_driver = make_user("mdriver3", "DRIVER")
        self.client.force_authenticate(lone_driver)
        res = self.client.post(self.url, {"log_type": "SERVICE", "date": str(date.today())}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_driver_can_edit_and_delete_own_entry(self):
        self.client.force_authenticate(self.driver1)
        res = self.client.patch(f"{self.url}{self.log1.id}/", {"cost": "1600.00"}, format="json")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["cost"], "1600.00")
        res = self.client.delete(f"{self.url}{self.log1.id}/")
        self.assertEqual(res.status_code, 204)

    def test_driver_cannot_edit_or_delete_other_bus_entry(self):
        self.client.force_authenticate(self.driver1)
        res = self.client.patch(f"{self.url}{self.log2.id}/", {"cost": "1.00"}, format="json")
        self.assertEqual(res.status_code, 404)
        res = self.client.delete(f"{self.url}{self.log2.id}/")
        self.assertEqual(res.status_code, 404)

    def test_staff_can_read_every_bus_but_not_write(self):
        staff = make_user("mstaff", "STAFF")
        self.client.force_authenticate(staff)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 2)
        res = self.client.post(self.url, {
            "bus": self.bus1.id, "log_type": "SERVICE", "date": str(date.today()),
        }, format="json")
        self.assertEqual(res.status_code, 403)
        res = self.client.delete(f"{self.url}{self.log1.id}/")
        self.assertEqual(res.status_code, 403)

    def test_summary_returns_latest_service_and_fuel(self):
        MaintenanceLog.objects.create(
            bus=self.bus1, log_type=MaintenanceLog.FUEL, date=date.today(), fuel_liters="25.0",
        )
        self.client.force_authenticate(self.driver1)
        res = self.client.get(f"{self.url}summary/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["last_service"]["id"], self.log1.id)
        self.assertIsNotNone(res.data["last_fuel"])

    def test_unauthenticated_user_is_rejected(self):
        res = self.client.get(self.url)
        self.assertIn(res.status_code, (401, 403))
