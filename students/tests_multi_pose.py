from datetime import date, timedelta
from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APITestCase

from attendance.models import AttendanceQRToken, AttendanceRecord, AttendanceSession
from attendance.test_face_security import make_bus, make_user
from students.face_utils import clean_pose_set, split_poses
from students.face_views import _find_duplicate_profile
from students.models import FaceProfile, Student

POSE_A = [0.10] * 128
POSE_B = [0.30] * 128
POSE_C = [0.50] * 128
FAR = [0.90] * 128
SAME_PERSON = [[0.100] * 128, [0.105] * 128, [0.095] * 128]  # close together, like real poses


class PoseHelperTests(TestCase):
    def test_split_poses_counts(self):
        self.assertEqual(len(split_poses(POSE_A)), 1)
        self.assertEqual(len(split_poses(POSE_A + POSE_B + POSE_C)), 3)

    def test_split_poses_rejects_bad_lengths(self):
        for bad in ([], [0.1] * 100, [0.1] * 129, [0.1] * (128 * 6), "abc", None):
            with self.subTest(bad=str(bad)[:20]):
                with self.assertRaises(ValueError):
                    split_poses(bad)

    def test_clean_pose_set_flattens_and_validates(self):
        self.assertEqual(len(clean_pose_set([POSE_A, POSE_B, POSE_C])), 384)
        for bad in ([], [POSE_A] * 6, [POSE_A, [0.1] * 127], "x", [POSE_A, ["a"] * 128]):
            with self.subTest(bad=str(bad)[:20]):
                with self.assertRaises(ValueError):
                    clean_pose_set(bad)


class MultiPoseFlowTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.bus = make_bus("MPOSE1")
        self.user = make_user("mp_student", "STUDENT")
        self.student = Student.objects.create(
            name="MP Student", roll_number="MP001", bus=self.bus, linked_user=self.user
        )
        self.client.force_authenticate(self.user)

    def _enroll(self, **payload):
        cache.clear()
        payload.setdefault("consent", True)
        return self.client.post("/api/students/me/face-enrollment/", payload, format="json")

    def test_enroll_three_poses_stores_flat_list(self):
        res = self._enroll(embeddings=SAME_PERSON)
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(len(FaceProfile.objects.get(student=self.student).embedding), 384)

    def test_enroll_old_single_embedding_still_works(self):
        res = self._enroll(embedding=POSE_A)
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(len(FaceProfile.objects.get(student=self.student).embedding), 128)

    def test_enroll_rejects_poses_of_different_people(self):
        res = self._enroll(embeddings=[POSE_A, FAR])
        self.assertEqual(res.status_code, 400)
        self.assertFalse(FaceProfile.objects.filter(student=self.student).exists())

    def test_enroll_rejects_too_many_or_bad_poses(self):
        self.assertEqual(self._enroll(embeddings=[POSE_A] * 6).status_code, 400)
        self.assertEqual(self._enroll(embeddings=[POSE_A, [0.1] * 127]).status_code, 400)

    def test_duplicate_guard_checks_every_stored_pose(self):
        other_user = make_user("mp_other", "STUDENT")
        other = Student.objects.create(
            name="Other", roll_number="MP002", bus=self.bus, linked_user=other_user
        )
        FaceProfile.objects.create(
            student=other, embedding=POSE_A + POSE_B + POSE_C,
            consent_given=True, consent_at=timezone.now(),
        )
        near_side_pose = [0.301] * 128  # close to POSE_B, far from POSE_A
        self.assertIsNotNone(_find_duplicate_profile(near_side_pose, exclude_student_id=self.student.pk))
        self.assertIsNone(_find_duplicate_profile(FAR, exclude_student_id=self.student.pk))


class MultiPoseScanTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.bus = make_bus("MPOSE2")
        self.user = make_user("mp_scan", "STUDENT")
        self.student = Student.objects.create(
            name="MP Scan", roll_number="MP010", bus=self.bus, linked_user=self.user
        )
        FaceProfile.objects.create(
            student=self.student, embedding=POSE_A + POSE_B + POSE_C,
            consent_given=True, consent_at=timezone.now(),
        )
        today = date.today()
        AttendanceSession.objects.create(bus=self.bus, date=today, slot="MORNING")
        self.token = AttendanceQRToken.objects.create(
            bus=self.bus, date=today, slot="MORNING", token="mp-token-0001",
            expires_at=timezone.now() + timedelta(minutes=5),
        )
        patcher = patch(
            "attendance.qr_views._slot_window_end",
            return_value=timezone.now() + timedelta(hours=1),
        )
        patcher.start()
        self.addCleanup(patcher.stop)
        self.client.force_authenticate(self.user)

    def _scan(self, embedding):
        cache.clear()
        return self.client.post(
            "/api/attendance/qr/scan/", {"token": self.token.token, "embedding": embedding}, format="json"
        )

    def test_scan_matching_a_side_pose_marks_present(self):
        res = self._scan(POSE_B)
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(AttendanceRecord.objects.filter(status="PRESENT").count(), 1)

    def test_scan_matching_no_pose_is_rejected(self):
        res = self._scan(FAR)
        self.assertEqual(res.status_code, 401)
        self.assertEqual(AttendanceRecord.objects.count(), 0)
