from django.test import override_settings

from attendance.models import AttendanceSession
from attendance.services import finalize_slot, run_due_finalizations, slot_is_pending
from attendance.tests_26 import Base, MON, TUE, MON_TO_SAT, at


@override_settings(ATTENDANCE_WORKING_WEEKDAYS=MON_TO_SAT, ATTENDANCE_START_DATE=TUE)
class StartDateTests(Base):
    def test_days_before_start_date_are_skipped(self):
        r = finalize_slot(MON, "MORNING")
        self.assertTrue(r["skipped"])
        self.assertEqual(AttendanceSession.objects.count(), 0)
        self.assertFalse(slot_is_pending(MON, "MORNING"))

    def test_start_date_itself_is_processed(self):
        r = finalize_slot(TUE, "MORNING")
        self.assertFalse(r["skipped"])
        self.assertEqual(r["absent_created"], 4)

    @override_settings(ATTENDANCE_CATCHUP_DAYS=3)
    def test_clock_never_backfills_before_start_date(self):
        results = run_due_finalizations(now=at(TUE, 12, 0))
        self.assertEqual({(r["date"], r["slot"]) for r in results}, {(TUE, "MORNING")})
        self.assertFalse(AttendanceSession.objects.filter(date__lt=TUE).exists())
