from django.utils import timezone
from rest_framework.test import APITestCase

from attendance.models import AttendanceFlag

from .tests import make_user


class FlagListTests(APITestCase):
    url = "/api/attendance/flags/"

    def setUp(self):
        self.admin = make_user("flagadmin", None)
        self.admin.is_staff = True
        self.admin.save(update_fields=["is_staff"])
        self.student = make_user("flagstudent", "STUDENT")
        self.open_flag = AttendanceFlag.objects.create(rule="HOLIDAY_ATTENDANCE")
        self.dismissed_flag = AttendanceFlag.objects.create(rule="IDENTICAL_SCORES", status="DISMISSED")

    def test_non_staff_cannot_list_flags(self):
        self.client.force_authenticate(self.student)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 403)

    def test_staff_sees_open_flags_by_default(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 200)
        rules = [f["rule"] for f in res.data]
        self.assertIn("HOLIDAY_ATTENDANCE", rules)
        self.assertNotIn("IDENTICAL_SCORES", rules)

    def test_status_all_returns_every_flag(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get(self.url, {"status": "ALL"})
        self.assertEqual(len(res.data), 2)

    def test_status_filter_dismissed(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get(self.url, {"status": "DISMISSED"})
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["rule"], "IDENTICAL_SCORES")


class FlagReviewTests(APITestCase):
    def setUp(self):
        self.admin = make_user("flagadmin2", None)
        self.admin.is_staff = True
        self.admin.save(update_fields=["is_staff"])
        self.student = make_user("flagstudent2", "STUDENT")
        self.flag = AttendanceFlag.objects.create(rule="SAME_IP_BURST")
        self.url = f"/api/attendance/flags/{self.flag.pk}/review/"

    def test_non_staff_cannot_review(self):
        self.client.force_authenticate(self.student)
        res = self.client.patch(self.url, {"status": "DISMISSED"})
        self.assertEqual(res.status_code, 403)

    def test_review_missing_flag_404s(self):
        self.client.force_authenticate(self.admin)
        res = self.client.patch("/api/attendance/flags/999999/review/", {"status": "DISMISSED"})
        self.assertEqual(res.status_code, 404)

    def test_review_bad_status_400s(self):
        self.client.force_authenticate(self.admin)
        res = self.client.patch(self.url, {"status": "NOT_A_STATUS"})
        self.assertEqual(res.status_code, 400)

    def test_review_success_sets_fields(self):
        self.client.force_authenticate(self.admin)
        res = self.client.patch(self.url, {"status": "REVIEWED", "review_note": "Checked, looks fine."})
        self.assertEqual(res.status_code, 200, res.data)
        self.flag.refresh_from_db()
        self.assertEqual(self.flag.status, "REVIEWED")
        self.assertEqual(self.flag.reviewed_by, self.admin)
        self.assertEqual(self.flag.review_note, "Checked, looks fine.")
        self.assertIsNotNone(self.flag.reviewed_at)
