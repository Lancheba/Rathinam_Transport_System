from datetime import time
from unittest.mock import patch

from django.test import override_settings
from rest_framework.test import APITestCase

from attendance.models import AttendanceWindowConfig, Holiday
from attendance.tests_26 import MON, MON_TO_SAT, SUN, at, make_user

URL = "/api/attendance/qr/window/"


@override_settings(ATTENDANCE_WORKING_WEEKDAYS=MON_TO_SAT)
class QRWindowEndpointTests(APITestCase):
    def setUp(self):
        self.incharge = make_user("ic27", "INCHARGE")
        cfg = AttendanceWindowConfig.get_solo()
        cfg.morning_start, cfg.morning_end = time(5, 0), time(9, 30)
        cfg.evening_start, cfg.evening_end = time(16, 30), time(19, 30)
        cfg.save()
        self.client.force_authenticate(self.incharge)

    def _get(self, when):
        with patch("django.utils.timezone.now", return_value=when):
            return self.client.get(URL)

    def test_closed_at_3am_with_default_windows(self):
        r = self._get(at(MON, 3, 0))
        self.assertEqual(r.status_code, 200)
        self.assertIsNone(r.data["slot"])
        self.assertTrue(r.data["school_day"])

    def test_morning_and_evening_open_inside_their_windows(self):
        self.assertEqual(self._get(at(MON, 8, 0)).data["slot"], "MORNING")
        self.assertEqual(self._get(at(MON, 17, 0)).data["slot"], "EVENING")

    def test_follows_the_admin_configured_window(self):
        cfg = AttendanceWindowConfig.get_solo()
        cfg.morning_start, cfg.morning_end = time(1, 0), time(7, 30)
        cfg.save()
        self.assertEqual(self._get(at(MON, 3, 0)).data["slot"], "MORNING")

    def test_closed_on_declared_holiday(self):
        Holiday.objects.create(date=MON)
        r = self._get(at(MON, 8, 0))
        self.assertIsNone(r.data["slot"])
        self.assertFalse(r.data["school_day"])

    def test_closed_on_sunday(self):
        r = self._get(at(SUN, 8, 0))
        self.assertIsNone(r.data["slot"])
        self.assertFalse(r.data["school_day"])

    def test_returns_configured_times(self):
        r = self._get(at(MON, 8, 0))
        self.assertEqual(r.data["morning"], ["05:00", "09:30"])
        self.assertEqual(r.data["evening"], ["16:30", "19:30"])

    def test_students_are_forbidden(self):
        self.client.force_authenticate(make_user("stu27", "STUDENT"))
        self.assertEqual(self._get(at(MON, 8, 0)).status_code, 403)
