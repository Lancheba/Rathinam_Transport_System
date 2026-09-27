from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase
from django.core.cache import cache
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient

from attendance.models import AttendanceQRToken, AttendanceSession
from buses.models import Bus
from students.models import FaceProfile, Student

GENERATE_URL = "/api/attendance/qr/generate/"
SCAN_URL = "/api/attendance/qr/scan/"
EMBEDDING = [0.1] * 128


def make_user(username, role):
    u = User.objects.create_user(username, password="pass1234")
    u.profile.role = role
    u.profile.save()
    return u


def make_bus(number, incharge):
    return Bus.objects.create(
        bus_number=number, route="Test route", rfid_uid=f"RFID-{number}",
        departure_time="08:00", length_m="10.00", width_m="2.50", incharge=incharge,
    )


class QRTokenCleanupTests(TestCase):
    def setUp(self):
        cache.clear()
        self.today = timezone.localdate()
        self.incharge = make_user("ic30", "INCHARGE")
        self.student_user = make_user("stu30", "STUDENT")
        self.bus = make_bus("V30A", self.incharge)
        self.student = Student.objects.create(
            roll_number="V030", name="Q30", bus=self.bus, linked_user=self.student_user,
        )
        FaceProfile.objects.create(student=self.student, embedding=EMBEDDING, consent_given=True)

        patcher = patch(
            "attendance.qr_views._current_slot", return_value="MORNING",
        )
        patcher.start()
        self.addCleanup(patcher.stop)
        patcher2 = patch(
            "attendance.qr_views._slot_window_end",
            return_value=timezone.now() + timedelta(hours=1),
        )
        patcher2.start()
        self.addCleanup(patcher2.stop)

    def _generate(self):
        client = APIClient()
        client.force_authenticate(self.incharge)
        r = client.post(GENERATE_URL, {}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        return r.data["token"] if "token" in r.data else r

    def test_generating_a_new_token_invalidates_the_old_one(self):
        old_token = AttendanceQRToken.objects.create(
            bus=self.bus, date=self.today, slot="MORNING", token="old-token-30",
            expires_at=timezone.now() + timedelta(minutes=5),
        )
        self._generate()

        self.assertFalse(
            AttendanceQRToken.objects.filter(pk=old_token.pk).exists(),
            "old unexpired token should be deleted when a new one is generated",
        )

        client = APIClient()
        client.force_authenticate(self.student_user)
        r = client.post(SCAN_URL, {"token": "old-token-30", "embedding": EMBEDDING}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("invalid", r.data["detail"].lower())

    def test_generating_does_not_touch_already_expired_tokens_of_other_buses(self):
        other_incharge = make_user("ic30b", "INCHARGE")
        other_bus = make_bus("V30B", other_incharge)
        other_token = AttendanceQRToken.objects.create(
            bus=other_bus, date=self.today, slot="MORNING", token="other-token-30",
            expires_at=timezone.now() + timedelta(minutes=5),
        )
        self._generate()
        self.assertTrue(AttendanceQRToken.objects.filter(pk=other_token.pk).exists())

    def test_cleanup_command_deletes_only_expired_tokens(self):
        expired = AttendanceQRToken.objects.create(
            bus=self.bus, date=self.today, slot="MORNING", token="expired-30",
            expires_at=timezone.now() - timedelta(minutes=1),
        )
        live = AttendanceQRToken.objects.create(
            bus=self.bus, date=self.today, slot="EVENING", token="live-30",
            expires_at=timezone.now() + timedelta(minutes=5),
        )
        from django.core.management import call_command
        call_command("cleanup_expired_qr_tokens")
        self.assertFalse(AttendanceQRToken.objects.filter(pk=expired.pk).exists())
        self.assertTrue(AttendanceQRToken.objects.filter(pk=live.pk).exists())
