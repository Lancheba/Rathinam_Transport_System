from io import StringIO

from django.contrib.auth.models import User
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from attendance.models import AttendanceAudit, AttendanceRecord, AttendanceSession
from attendance.services import RuleViolation, set_attendance
from buses.models import Bus
from students.models import Student


def make_user(username, role):
    u = User.objects.create_user(username, password="pass")
    u.profile.role = role
    u.profile.save()
    return u


class RevokeAndRuleTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = make_user("adm1", "ADMIN")
        self.staff = make_user("staff1", "STAFF")
        self.incharge = make_user("ic1", "INCHARGE")
        self.bus = Bus.objects.create(
            bus_number="BUS-01", route="X", departure_time="08:00",
            length_m=10.0, width_m=2.5, rfid_uid="RFID-01", incharge=self.incharge,
        )
        self.alice = Student.objects.create(roll_number="R001", name="Alice", bus=self.bus)
        self.bob = Student.objects.create(roll_number="R002", name="Bob", bus=self.bus)
        self.session = AttendanceSession.objects.create(
            bus=self.bus, date=timezone.localdate(), slot="MORNING", opened_at=timezone.now(),
        )
        self.present = AttendanceRecord.objects.create(
            session=self.session, person_type="STUDENT", student=self.alice,
            status="PRESENT", source="QR_FACE", marked_at=timezone.now(),
        )
        self.url = f"/api/attendance/records/{self.present.pk}/revoke/"

    def test_admin_revokes_present_and_audit_row_written(self):
        self.client.force_authenticate(user=self.admin)
        r = self.client.patch(self.url, {"reason": "Marked by mistake, was absent"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.present.refresh_from_db()
        self.assertEqual(self.present.status, "ABSENT")
        rows = AttendanceAudit.objects.filter(record=self.present)
        self.assertEqual(rows.count(), 1)
        self.assertEqual(rows.first().action, "REVOKE")
        self.assertEqual(rows.first().old_status, "PRESENT")

    def test_staff_cannot_revoke(self):
        self.client.force_authenticate(user=self.staff)
        r = self.client.patch(self.url, {"reason": "Marked by mistake, was absent"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
        self.present.refresh_from_db()
        self.assertEqual(self.present.status, "PRESENT")

    def test_incharge_cannot_revoke(self):
        self.client.force_authenticate(user=self.incharge)
        r = self.client.patch(self.url, {"reason": "Marked by mistake, was absent"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_short_reason_rejected(self):
        self.client.force_authenticate(user=self.admin)
        r = self.client.patch(self.url, {"reason": "oops"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.present.refresh_from_db()
        self.assertEqual(self.present.status, "PRESENT")

    def test_cannot_revoke_an_absent_record(self):
        absent = AttendanceRecord.objects.create(
            session=self.session, person_type="STUDENT", student=self.bob,
            status="ABSENT", source="AUTO_ABSENT", marked_at=timezone.now(),
        )
        self.client.force_authenticate(user=self.admin)
        r = self.client.patch(
            f"/api/attendance/records/{absent.pk}/revoke/",
            {"reason": "Trying to revoke an absent one"}, format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(AttendanceAudit.objects.filter(record=absent).count(), 0)

    @override_settings(ATTENDANCE_MANUAL_DAILY_CAP=1)
    def test_manual_mark_daily_cap(self):
        set_attendance(
            session=self.session, person_type="STUDENT", student=self.bob,
            status="PRESENT", action="MANUAL", source="MANUAL",
            actor=self.incharge, reason="Face scan failed twice today",
        )
        carol = Student.objects.create(roll_number="R003", name="Carol", bus=self.bus)
        with self.assertRaises(RuleViolation) as ctx:
            set_attendance(
                session=self.session, person_type="STUDENT", student=carol,
                status="PRESENT", action="MANUAL", source="MANUAL",
                actor=self.incharge, reason="Face scan failed again today",
            )
        self.assertEqual(ctx.exception.status_code, 429)
        self.assertFalse(AttendanceRecord.objects.filter(session=self.session, student=carol).exists())

    def test_audit_chain_still_verifies_after_revoke(self):
        self.client.force_authenticate(user=self.admin)
        self.client.patch(self.url, {"reason": "Marked by mistake, was absent"}, format="json")
        out = StringIO()
        call_command("verify_audit_chain", stdout=out)
        self.assertIn("Audit chain OK", out.getvalue())