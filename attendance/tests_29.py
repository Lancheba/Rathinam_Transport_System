from datetime import time
from unittest.mock import patch

from django.conf import settings
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from attendance.models import AttendanceWindowConfig
from attendance.qr_views import _current_slot, _slot_window_end
from attendance.services import get_windows, run_due_finalizations
from attendance.tests_26 import Base, MON, MON_TO_SAT, at, make_user


@override_settings(ATTENDANCE_WORKING_WEEKDAYS=MON_TO_SAT, ATTENDANCE_CATCHUP_DAYS=0)
class ConfiguredWindowsEverywhereTests(Base):
    def _set(self, **changes):
        cfg = AttendanceWindowConfig.get_solo()
        for key, value in changes.items():
            setattr(cfg, key, value)
        cfg.save()

    def test_get_windows_reads_the_config(self):
        self._set(morning_start=time(1, 0), morning_end=time(7, 30))
        w = get_windows()
        self.assertEqual(w["MORNING"], (time(1, 0), time(7, 30)))
        self.assertEqual(w["EVENING"], (time(16, 30), time(19, 30)))

    def test_current_slot_follows_the_config(self):
        with patch("django.utils.timezone.now", return_value=at(MON, 3, 0)):
            self.assertIsNone(_current_slot())
            self._set(morning_start=time(1, 0), morning_end=time(7, 30))
            self.assertEqual(_current_slot(), "MORNING")

    def test_window_end_follows_the_config(self):
        with patch("django.utils.timezone.now", return_value=at(MON, 3, 0)):
            self.assertEqual(timezone.localtime(_slot_window_end("MORNING")).time(), time(9, 30))
            self._set(morning_end=time(11, 0))
            self.assertEqual(timezone.localtime(_slot_window_end("MORNING")).time(), time(11, 0))

    def test_clock_follows_the_config(self):
        self._set(morning_end=time(11, 0))
        self.assertEqual(run_due_finalizations(now=at(MON, 9, 31)), [])
        results = run_due_finalizations(now=at(MON, 11, 1))
        self.assertEqual([r["slot"] for r in results], ["MORNING"])

    def test_window_endpoint_follows_the_config(self):
        client = APIClient()
        client.force_authenticate(make_user("ic29", "INCHARGE"))
        self._set(morning_start=time(1, 0), morning_end=time(7, 30))
        with patch("django.utils.timezone.now", return_value=at(MON, 3, 0)):
            r = client.get("/api/attendance/qr/window/")
        self.assertEqual(r.data["slot"], "MORNING")
        self.assertEqual(r.data["morning"], ["01:00", "07:30"])

    def test_old_hardcoded_window_settings_are_gone(self):
        self.assertFalse(hasattr(settings, "ATTENDANCE_MORNING_WINDOW"))
        self.assertFalse(hasattr(settings, "ATTENDANCE_EVENING_WINDOW"))
