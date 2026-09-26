from io import StringIO
from unittest import mock
from unittest import skipUnless

from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db import connection
from django.test import TestCase, override_settings
from django.utils import timezone

from attendance.management.commands.run_attendance_clock import Command as ClockCommand
from attendance.models import AttendanceAudit, AttendanceSession
from attendance.services import set_attendance
from buses.models import Bus
from students.models import Student

CLOCK = "attendance.management.commands.run_attendance_clock"


class AuditChainTests(TestCase):
    def setUp(self):
        u = User.objects.create_user("ic1", password="pass")
        u.profile.role = "INCHARGE"
        u.profile.save()
        bus = Bus.objects.create(
            bus_number="BUS-01", route="X", departure_time="08:00",
            length_m=10.0, width_m=2.5, rfid_uid="RFID-01", incharge=u,
        )
        self.student = Student.objects.create(roll_number="R001", name="Alice", bus=bus)
        self.session = AttendanceSession.objects.create(
            bus=bus, date=timezone.localdate(), slot="MORNING", opened_at=timezone.now(),
        )
        self.key = f"audit-chain-verified:{timezone.localdate()}"
        cache.delete(self.key)

    def _scan(self):
        return set_attendance(
            session=self.session, person_type="STUDENT", student=self.student,
            status="PRESENT", action="SCAN", source="QR_FACE", ip_address="10.0.0.5",
        )

    def test_clean_chain_passes(self):
        self._scan()
        out = StringIO()
        call_command("verify_audit_chain", stdout=out)
        self.assertIn("Audit chain OK", out.getvalue())

    @skipUnless(connection.vendor == 'postgresql', 'audit-immutability trigger only exists on Postgres')
    def test_tampering_is_detected(self):
        self._scan()
        # Before the attendance_audit_immutable Postgres trigger (migration
        # 0010) was fixed and actually applying, this ORM .update() call
        # silently succeeded - bypassing the Python-level guard exactly like
        # a determined attacker with raw SQL access would - and the test
        # verified that verify_audit_chain caught the tampering afterwards
        # via a hash mismatch.
        # Now that the trigger is live, Postgres itself refuses the UPDATE
        # before it ever happens, which is a strictly stronger guarantee
        # than after-the-fact chain verification. That means this exact
        # bypass is no longer reachable, so we assert the DB rejects it
        # directly instead of asserting verify_audit_chain catches it.
        from django.db.utils import InternalError
        with self.assertRaises(InternalError):
            AttendanceAudit.objects.update(new_status="ABSENT")

    @override_settings(AUDIT_VERIFY_HOUR=0)
    def test_clock_verifies_only_once_per_day(self):
        cmd = ClockCommand()
        with mock.patch(f"{CLOCK}.call_command") as fake:
            cmd._verify_chain_daily()
            cmd._verify_chain_daily()
        fake.assert_called_once()
        self.assertEqual(fake.call_args[0][0], "verify_audit_chain")

    @override_settings(AUDIT_VERIFY_HOUR=0)
    def test_clock_logs_failure_and_does_not_crash(self):
        cmd = ClockCommand()
        cmd.stderr = StringIO()
        with mock.patch(f"{CLOCK}.call_command", side_effect=CommandError("boom")):
            with self.assertLogs(CLOCK, level="ERROR"):
                cmd._verify_chain_daily()
