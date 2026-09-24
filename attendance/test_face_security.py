from datetime import date, timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APITestCase

from attendance.models import AttendanceQRToken, AttendanceRecord, AttendanceSession
from buses.models import Bus
from students.models import FaceProfile, Student

SCAN_URL = "/api/attendance/qr/scan/"
ENROLL_URL = "/api/students/me/face-enrollment/"

STORED = [0.1] * 128
DIFFERENT_FACE = [0.1 if i % 2 == 0 else -0.1 for i in range(128)]

# Every one of these must be rejected with 400 and must never mark anyone present.
BAD_EMBEDDINGS = {
    "huge_positive": [1.7e308] * 128,
    "huge_negative": [-1.7e308] * 128,
    "too_short": [0.1] * 127,
    "too_long": [0.1] * 129,
    "strings": ["a"] * 128,
    "nulls": [None] * 128,
    "booleans": [True] * 128,
    "out_of_range": [3.0] * 128,
    "not_a_list_string": "abcdef",
    "not_a_list_dict": {"a": 1},
    "not_a_list_number": 5,
}


def make_user(username, role):
    user = User.objects.create_user(username, password="pass1234")
    user.profile.role = role
    user.profile.save()
    return user


def make_bus(number):
    return Bus.objects.create(
        bus_number=number, route="Security test route", rfid_uid=f"RFID-{number}",
        departure_time="08:00", length_m="10.00", width_m="2.50",
    )


class FaceScanSecurityTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.bus = make_bus("SEC1")
        self.user = make_user("sec_student", "STUDENT")
        self.student = Student.objects.create(
            name="Sec Student", roll_number="SEC001", bus=self.bus, linked_user=self.user
        )
        FaceProfile.objects.create(
            student=self.student, embedding=STORED,
            consent_given=True, consent_at=timezone.now(),
        )
        today = date.today()
        AttendanceSession.objects.create(bus=self.bus, date=today, slot="MORNING")
        self.token = AttendanceQRToken.objects.create(
            bus=self.bus, date=today, slot="MORNING", token="sec-token-0001",
            expires_at=timezone.now() + timedelta(minutes=5),
        )
        # Keep the session "open" no matter what time the test runs.
        patcher = patch(
            "attendance.qr_views._slot_window_end",
            return_value=timezone.now() + timedelta(hours=1),
        )
        patcher.start()
        self.addCleanup(patcher.stop)
        self.client.force_authenticate(self.user)

    def _scan(self, embedding):
        cache.clear()  # the scan endpoint is throttled to 12/min
        return self.client.post(
            SCAN_URL, {"token": self.token.token, "embedding": embedding}, format="json"
        )

    def test_positive_control_genuine_face_marks_present(self):
        res = self._scan(STORED)
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(AttendanceRecord.objects.filter(status="PRESENT").count(), 1)

    def test_bad_embeddings_are_rejected_and_mark_nobody(self):
        for name, embedding in BAD_EMBEDDINGS.items():
            with self.subTest(payload=name):
                AttendanceRecord.objects.all().delete()
                res = self._scan(embedding)
                self.assertEqual(res.status_code, 400)
                self.assertEqual(AttendanceRecord.objects.count(), 0)

    def test_failed_match_is_401_and_does_not_leak_the_score(self):
        res = self._scan(DIFFERENT_FACE)
        self.assertEqual(res.status_code, 401)
        self.assertNotIn("score", res.data)
        self.assertEqual(AttendanceRecord.objects.count(), 0)


class FaceEnrollmentSecurityTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.bus = make_bus("SEC2")
        self.user = make_user("enroll_student", "STUDENT")
        self.student = Student.objects.create(
            name="Enroll Student", roll_number="SEC002", bus=self.bus, linked_user=self.user
        )
        self.client.force_authenticate(self.user)

    def _enroll(self, embedding):
        cache.clear()
        # Fresh user object each time: Django caches student_profile/face_profile on the
        # instance, which would hide rows this test deleted.
        self.client.force_authenticate(User.objects.get(pk=self.user.pk))
        return self.client.post(
            ENROLL_URL, {"embedding": embedding, "consent": True}, format="json"
        )

    def test_positive_control_valid_embedding_enrolls(self):
        res = self._enroll(STORED)
        self.assertEqual(res.status_code, 201, res.data)
        self.assertTrue(FaceProfile.objects.filter(student=self.student).exists())

    def test_bad_embeddings_are_rejected_and_never_stored(self):
        for name, embedding in BAD_EMBEDDINGS.items():
            with self.subTest(payload=name):
                FaceProfile.objects.filter(student=self.student).delete()
                res = self._enroll(embedding)
                self.assertEqual(res.status_code, 400)
                self.assertFalse(FaceProfile.objects.filter(student=self.student).exists())