from datetime import date

from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from buses.models import Bus
from students.models import Student

from .models import TemporaryInchargeAssignment
from .tests import make_user, make_bus


class InchargeDelegateTests(APITestCase):
    url = "/api/attendance/incharge/delegate/"

    def setUp(self):
        self.bus = make_bus("D30")
        self.incharge = make_user("incharge30", "INCHARGE")
        self.bus.incharge = self.incharge
        self.bus.save(update_fields=["incharge"])

        self.standin_user = make_user("standin30", "STUDENT")
        self.standin_student = Student.objects.create(
            name="Standin", roll_number="R930", bus=self.bus, linked_user=self.standin_user,
        )

        self.other_bus = make_bus("D31")
        self.other_bus_user = make_user("other30", "STUDENT")
        self.other_bus_student = Student.objects.create(
            name="Other", roll_number="R931", bus=self.other_bus, linked_user=self.other_bus_user,
        )

        self.unlinked_student = Student.objects.create(name="Unlinked", roll_number="R932", bus=self.bus)

        self.admin = make_user("admin30")
        self.admin.is_staff = True
        self.admin.save(update_fields=["is_staff"])

        self.random_student_user = make_user("random30", "STUDENT")

    def test_random_user_cannot_delegate(self):
        self.client.force_authenticate(self.random_student_user)
        res = self.client.post(self.url, {"student_id": self.standin_student.pk})
        self.assertEqual(res.status_code, 403)

    def test_incharge_can_delegate_to_own_bus_student(self):
        self.client.force_authenticate(self.incharge)
        res = self.client.post(self.url, {"student_id": self.standin_student.pk})
        self.assertEqual(res.status_code, 201, res.data)
        self.assertTrue(TemporaryInchargeAssignment.objects.filter(
            bus=self.bus, stand_in=self.standin_user, date=date.today(), is_active=True,
        ).exists())

    def test_cannot_delegate_to_student_on_another_bus(self):
        self.client.force_authenticate(self.incharge)
        res = self.client.post(self.url, {"student_id": self.other_bus_student.pk})
        self.assertEqual(res.status_code, 404)

    def test_cannot_delegate_to_unlinked_student(self):
        self.client.force_authenticate(self.incharge)
        res = self.client.post(self.url, {"student_id": self.unlinked_student.pk})
        self.assertEqual(res.status_code, 400)

    def test_standin_gains_roster_access_and_loses_it_after_end(self):
        self.client.force_authenticate(self.incharge)
        self.client.post(self.url, {"student_id": self.standin_student.pk})

        self.client.force_authenticate(self.standin_user)
        res = self.client.get("/api/attendance/qr/roster/")
        self.assertEqual(res.status_code, 200, res.data)

        self.client.force_authenticate(self.incharge)
        res = self.client.delete(self.url)
        self.assertEqual(res.status_code, 200, res.data)

        self.client.force_authenticate(self.standin_user)
        res = self.client.get("/api/attendance/qr/roster/")
        self.assertEqual(res.status_code, 403)

    def test_me_endpoint_reports_standin_bus_number(self):
        self.client.force_authenticate(self.incharge)
        self.client.post(self.url, {"student_id": self.standin_student.pk})

        self.client.force_authenticate(self.standin_user)
        res = self.client.get("/api/auth/me/")
        self.assertEqual(res.data.get("standin_bus_number"), "D30")

    def test_get_status_reflects_active_delegation(self):
        self.client.force_authenticate(self.incharge)
        self.client.post(self.url, {"student_id": self.standin_student.pk})
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["active"])
        self.assertEqual(res.data["roll_number"], "R930")

    def test_admin_can_delegate_with_bus_query_param(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(f"{self.url}?bus={self.bus.pk}", {"student_id": self.standin_student.pk})
        self.assertEqual(res.status_code, 201, res.data)
