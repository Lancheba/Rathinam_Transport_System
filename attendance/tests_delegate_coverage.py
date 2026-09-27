"""
Additional attendance/delegate_views.py branch coverage. tests_delegate.py
already covers the main happy paths; these fill the specific uncovered
lines from the audit (40, 44-45, 63, 78, 89, 100, 107-111, 125).
"""
from datetime import date

from django.utils import timezone
from rest_framework.test import APITestCase

from students.models import Student

from .models import AttendanceRecord, AttendanceSession, TemporaryInchargeAssignment
from .tests import make_bus, make_user


class DelegateViewsBranchTests(APITestCase):
    url = "/api/attendance/incharge/delegate/"

    def setUp(self):
        self.bus = make_bus("D40")
        self.incharge = make_user("incharge40", "INCHARGE")
        self.bus.incharge = self.incharge
        self.bus.save(update_fields=["incharge"])

        self.standin_user = make_user("standin40", "STUDENT")
        self.standin_student = Student.objects.create(
            name="Standin40", roll_number="R940", bus=self.bus, linked_user=self.standin_user,
        )
        self.second_standin_user = make_user("standin40b", "STUDENT")
        self.second_standin_student = Student.objects.create(
            name="Standin40B", roll_number="R941", bus=self.bus, linked_user=self.second_standin_user,
        )

        self.admin = make_user("admin40", None)
        self.admin.is_staff = True
        self.admin.save(update_fields=["is_staff"])

    # -- line 40: staff/admin with no bus id at all --
    def test_admin_without_bus_param_gets_400(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 400)
        self.assertIn("Provide", res.data["detail"])

    # -- lines 44-45: staff/admin with a bus id that doesn't exist --
    def test_admin_with_unknown_bus_id_gets_404(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get(self.url, {"bus": 999999})
        self.assertEqual(res.status_code, 404)

    def test_admin_with_non_numeric_bus_id_gets_404(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get(self.url, {"bus": "not-a-number"})
        self.assertEqual(res.status_code, 404)

    # -- line 63: GET with no active delegation --
    def test_get_with_no_active_delegation_returns_inactive(self):
        self.client.force_authenticate(self.incharge)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data, {"active": False})

    # -- line 78: DELETE with no active delegation --
    def test_delete_with_no_active_delegation_gets_404(self):
        self.client.force_authenticate(self.incharge)
        res = self.client.delete(self.url)
        self.assertEqual(res.status_code, 404)

    # -- line 89: POST with no student_id --
    def test_post_without_student_id_gets_400(self):
        self.client.force_authenticate(self.incharge)
        res = self.client.post(self.url, {})
        self.assertEqual(res.status_code, 400)
        self.assertIn("student_id is required", res.data["detail"])

    # -- line 100: target is already an in-charge somewhere --
    def test_cannot_delegate_to_someone_already_an_incharge(self):
        self.standin_user.profile.role = "INCHARGE"
        self.standin_user.profile.save()

        self.client.force_authenticate(self.incharge)
        res = self.client.post(self.url, {"student_id": self.standin_student.pk})
        self.assertEqual(res.status_code, 400)
        self.assertIn("cannot already be", res.data["detail"])

    # -- lines 107-111: reusing/reactivating an existing assignment row for today --
    def test_second_delegation_same_day_reuses_existing_row(self):
        self.client.force_authenticate(self.incharge)
        first = self.client.post(self.url, {"student_id": self.standin_student.pk})
        self.assertEqual(first.status_code, 201, first.data)

        # End it, then delegate to someone else the same day -- should
        # reactivate/overwrite the existing row rather than create a new one.
        self.client.delete(self.url)
        second = self.client.post(self.url, {"student_id": self.second_standin_student.pk})
        self.assertEqual(second.status_code, 201, second.data)

        self.assertEqual(
            TemporaryInchargeAssignment.objects.filter(bus=self.bus, date=date.today()).count(), 1,
        )
        assignment = TemporaryInchargeAssignment.objects.get(bus=self.bus, date=date.today())
        self.assertEqual(assignment.stand_in, self.second_standin_user)
        self.assertTrue(assignment.is_active)

    # -- line 125: an open session exists, so the new stand-in gets auto-marked present --
    def test_delegating_during_open_session_auto_marks_standin_present(self):
        session = AttendanceSession.objects.create(
            bus=self.bus, date=date.today(), slot="MORNING", opened_at=timezone.now(),
        )
        self.client.force_authenticate(self.incharge)
        res = self.client.post(self.url, {"student_id": self.standin_student.pk})
        self.assertEqual(res.status_code, 201, res.data)

        record = AttendanceRecord.objects.filter(session=session, student=self.standin_student).first()
        self.assertIsNotNone(record)
        self.assertEqual(record.status, "PRESENT")
