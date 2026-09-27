from datetime import date, timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APITestCase

from attendance.models import AttendanceAudit, AttendanceQRToken, AttendanceRecord, AttendanceSession
from buses.models import Bus
from students.models import FaceProfile, Student

SCAN_URL = "/api/attendance/qr/scan/"
STORED = [0.1] * 128


class ScanHardeningTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.bus = Bus.objects.create(
            bus_number="HARD1", route="Hardening route", rfid_uid="RFID-HARD1",
            departure_time="08:00", length_m="10.00", width_m="2.50",
        )
        self.user = User.objects.create_user("hard_student", password="pass1234")
        self.user.profile.role = "STUDENT"
        self.user.profile.save()
        self.student = Student.objects.create(
            name="Hard Student", roll_number="HARD001", bus=self.bus, linked_user=self.user
        )
        FaceProfile.objects.create(
            student=self.student, embedding=STORED,
            consent_given=True, consent_at=timezone.now(),
        )
        today = date.today()
        self.session = AttendanceSession.objects.create(bus=self.bus, date=today, slot="MORNING")
        self.token = AttendanceQRToken.objects.create(
            bus=self.bus, date=today, slot="MORNING", token="hard-token-0001",
            expires_at=timezone.now() + timedelta(minutes=5),
        )
        patcher = patch(
            "attendance.qr_views._slot_window_end",
            return_value=timezone.now() + timedelta(hours=1),
        )
        patcher.start()
        self.addCleanup(patcher.stop)
        self.client.force_authenticate(self.user)

    def _scan(self, **extra):
        cache.clear()  # the scan endpoint is throttled
        return self.client.post(
            SCAN_URL, {"token": self.token.token, "embedding": STORED}, format="json", **extra
        )

    def test_expired_token_is_rejected_and_marks_nobody(self):
        AttendanceQRToken.objects.filter(pk=self.token.pk).update(
            expires_at=timezone.now() - timedelta(seconds=1)
        )
        res = self._scan()
        self.assertEqual(res.status_code, 400)
        self.assertEqual(AttendanceRecord.objects.count(), 0)

    def test_second_scan_is_rejected_and_adds_no_audit_row(self):
        self.assertEqual(self._scan().status_code, 200)
        second = self._scan()
        self.assertEqual(second.status_code, 400)
        self.assertIn("already marked present", second.data["detail"])
        self.assertEqual(AttendanceAudit.objects.count(), 1)

    def test_user_agent_is_stored_on_the_audit_row(self):
        self.assertEqual(self._scan(HTTP_USER_AGENT="TestPhone/1.0").status_code, 200)
        self.assertEqual(AttendanceAudit.objects.get().user_agent, "TestPhone/1.0")

class DeviceIdTests(ScanHardeningTests):
    def test_device_id_header_is_stored_on_the_audit_row(self):
        res = self._scan(HTTP_X_DEVICE_ID="phone-abc-123")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(AttendanceAudit.objects.get().device_id, "phone-abc-123")

    def test_missing_device_id_is_stored_as_blank_not_error(self):
        res = self._scan()
        self.assertEqual(res.status_code, 200)
        self.assertEqual(AttendanceAudit.objects.get().device_id, "")