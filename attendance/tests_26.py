from datetime import date, datetime, time
from io import StringIO
from unittest.mock import patch
from datetime import timedelta

from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from attendance.models import (
    AttendanceQRToken, AttendanceRecord, AttendanceSession,
    AttendanceWindowConfig, Holiday, Teacher,
)
from attendance.services import finalize_slot, run_due_finalizations, slot_is_pending
from buses.models import Bus
from students.models import Student

MON = date(2026, 9, 21)
TUE = date(2026, 9, 22)
SUN = date(2026, 9, 27)
MON_TO_SAT = (0, 1, 2, 3, 4, 5)
ALL_DAYS = tuple(range(7))


def at(day, hour, minute=0):
    return timezone.make_aware(datetime.combine(day, time(hour, minute)))


def make_user(username, role):
    u = User.objects.create_user(username, password="pass1234")
    u.profile.role = role
    u.profile.save()
    return u


def make_bus(number, incharge=None, active=True):
    return Bus.objects.create(
        bus_number=number, route="Test route", rfid_uid=f"RFID-{number}",
        departure_time="08:00", length_m="10.00", width_m="2.50",
        incharge=incharge, is_active=active,
    )


class Base(TestCase):
    def setUp(self):
        cfg = AttendanceWindowConfig.get_solo()
        cfg.morning_start, cfg.morning_end = time(5, 0), time(9, 30)
        cfg.evening_start, cfg.evening_end = time(16, 30), time(19, 30)
        cfg.save()

        self.bus1 = make_bus("C1")
        self.bus2 = make_bus("C2")
        self.idle_bus = make_bus("C3")                    # no students or teachers
        self.inactive_bus = make_bus("C4", active=False)  # has a student but is inactive

        self.a1 = Student.objects.create(roll_number="C001", name="A1", bus=self.bus1)
        self.a2 = Student.objects.create(roll_number="C002", name="A2", bus=self.bus1)
        self.b1 = Student.objects.create(roll_number="C003", name="B1", bus=self.bus2)
        self.x1 = Student.objects.create(roll_number="C004", name="X1", bus=self.inactive_bus)
        self.teacher = Teacher.objects.create(name="Mr T", staff_id="CT1", bus=self.bus1)


@override_settings(ATTENDANCE_WORKING_WEEKDAYS=MON_TO_SAT)
class FinalizeSlotTests(Base):
    def test_creates_sessions_and_absents_without_any_qr(self):
        r = finalize_slot(MON, "MORNING")
        self.assertEqual(r["sessions_created"], 2)
        self.assertEqual(r["sessions_finalized"], 2)
        self.assertEqual(r["absent_created"], 4)  # a1, a2, teacher, b1
        sessions = AttendanceSession.objects.filter(date=MON, slot="MORNING")
        self.assertEqual({s.bus_id for s in sessions}, {self.bus1.pk, self.bus2.pk})
        self.assertTrue(all(s.auto_finalized for s in sessions))
        self.assertFalse(AttendanceRecord.objects.filter(student=self.x1).exists())

    def test_teachers_are_marked_absent(self):
        finalize_slot(MON, "MORNING")
        self.assertEqual(
            AttendanceRecord.objects.filter(
                teacher=self.teacher, status="ABSENT", source="AUTO_ABSENT").count(), 1)

    def test_present_records_survive(self):
        session = AttendanceSession.objects.create(bus=self.bus1, date=MON, slot="MORNING")
        AttendanceRecord.objects.create(
            session=session, person_type="STUDENT", student=self.a1,
            status="PRESENT", source="QR_FACE", marked_at=timezone.now())
        finalize_slot(MON, "MORNING")
        self.assertEqual(AttendanceRecord.objects.get(session=session, student=self.a1).status, "PRESENT")
        self.assertEqual(AttendanceRecord.objects.get(session=session, student=self.a2).status, "ABSENT")

    def test_running_twice_changes_nothing(self):
        finalize_slot(MON, "MORNING")
        second = finalize_slot(MON, "MORNING")
        self.assertEqual(second["sessions_created"], 0)
        self.assertEqual(second["sessions_finalized"], 0)
        self.assertEqual(second["absent_created"], 0)
        self.assertEqual(AttendanceRecord.objects.count(), 4)

    def test_declared_holiday_creates_nothing(self):
        Holiday.objects.create(date=MON, reason="Founders day")
        r = finalize_slot(MON, "MORNING")
        self.assertTrue(r["skipped"])
        self.assertEqual(AttendanceSession.objects.count(), 0)

    def test_sunday_creates_nothing(self):
        r = finalize_slot(SUN, "MORNING")
        self.assertTrue(r["skipped"])
        self.assertEqual(AttendanceSession.objects.count(), 0)

    def test_per_bus_holiday_session_is_left_alone(self):
        s = AttendanceSession.objects.create(
            bus=self.bus1, date=MON, slot="MORNING", is_holiday=True, holiday_reason="Bus off road")
        finalize_slot(MON, "MORNING")
        self.assertEqual(s.records.count(), 0)
        self.assertEqual(AttendanceRecord.objects.filter(session__bus=self.bus2).count(), 1)

    def test_command_backfills_a_given_date(self):
        call_command("finalize_attendance", slot="MORNING", date="2026-09-21", stdout=StringIO())
        self.assertEqual(AttendanceRecord.objects.filter(session__date=MON).count(), 4)

    def test_command_rejects_future_date(self):
        with self.assertRaises(CommandError):
            call_command("finalize_attendance", slot="MORNING", date="2099-01-01", stdout=StringIO())


@override_settings(ATTENDANCE_WORKING_WEEKDAYS=MON_TO_SAT, ATTENDANCE_CATCHUP_DAYS=0)
class ClockTests(Base):
    def test_not_due_before_window_end(self):
        self.assertEqual(run_due_finalizations(now=at(MON, 9, 0)), [])
        self.assertEqual(run_due_finalizations(now=at(MON, 9, 30)), [])
        self.assertEqual(AttendanceSession.objects.count(), 0)

    def test_due_one_minute_after_window_end(self):
        results = run_due_finalizations(now=at(MON, 9, 31))
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["slot"], "MORNING")

    def test_clock_down_for_an_hour_catches_up(self):
        # The window ended at 09:30 and the clock only came back at 10:45.
        results = run_due_finalizations(now=at(MON, 10, 45))
        self.assertEqual([r["slot"] for r in results], ["MORNING"])
        self.assertEqual(AttendanceRecord.objects.filter(session__date=MON).count(), 4)
        self.assertFalse(slot_is_pending(MON, "MORNING"))
        self.assertTrue(slot_is_pending(MON, "EVENING"))  # its window has not ended yet

    @override_settings(ATTENDANCE_CATCHUP_DAYS=1)
    def test_catches_up_a_missed_previous_day(self):
        results = run_due_finalizations(now=at(TUE, 8, 0))
        self.assertEqual({(r["date"], r["slot"]) for r in results},
                         {(MON, "MORNING"), (MON, "EVENING")})
        self.assertFalse(AttendanceSession.objects.filter(date=TUE).exists())

    def test_second_tick_does_nothing(self):
        run_due_finalizations(now=at(MON, 12, 0))
        self.assertEqual(run_due_finalizations(now=at(MON, 12, 1)), [])

    def test_declared_holiday_is_not_finalized(self):
        Holiday.objects.create(date=MON)
        self.assertEqual(run_due_finalizations(now=at(MON, 12, 0)), [])

    def test_sunday_is_not_finalized(self):
        self.assertEqual(run_due_finalizations(now=at(SUN, 23, 0)), [])


@override_settings(ATTENDANCE_WORKING_WEEKDAYS=ALL_DAYS)
class QRGuardTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.today = timezone.localdate()
        self.incharge = make_user("ic26", "INCHARGE")
        self.bus = make_bus("Q26", incharge=self.incharge)
        self.student_user = make_user("stu26", "STUDENT")
        self.student = Student.objects.create(
            roll_number="Q001", name="Quinn", bus=self.bus, linked_user=self.student_user)

    def test_generate_ok_on_a_normal_day(self):
        self.client.force_authenticate(self.incharge)
        with patch("attendance.qr_views._current_slot", return_value="MORNING"):
            r = self.client.post("/api/attendance/qr/generate/")
        self.assertEqual(r.status_code, 200)

    def test_generate_refused_on_declared_holiday(self):
        Holiday.objects.create(date=self.today, reason="Test holiday")
        self.client.force_authenticate(self.incharge)
        with patch("attendance.qr_views._current_slot", return_value="MORNING"):
            r = self.client.post("/api/attendance/qr/generate/")
        self.assertEqual(r.status_code, 400)
        self.assertIn("not taken", r.data["detail"])

    def test_generate_refused_on_non_working_weekday(self):
        wd = self.today.weekday()
        self.client.force_authenticate(self.incharge)
        with self.settings(ATTENDANCE_WORKING_WEEKDAYS=tuple(d for d in range(7) if d != wd)):
            with patch("attendance.qr_views._current_slot", return_value="MORNING"):
                r = self.client.post("/api/attendance/qr/generate/")
        self.assertEqual(r.status_code, 400)

    def test_manual_mark_refused_on_declared_holiday(self):
        AttendanceSession.objects.create(
            bus=self.bus, date=self.today, slot="MORNING", opened_at=timezone.now())
        Holiday.objects.create(date=self.today)
        self.client.force_authenticate(self.incharge)
        r = self.client.post("/api/attendance/qr/manual/", {
            "student_id": self.student.pk, "remark": "Face failed in poor light"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertFalse(AttendanceRecord.objects.filter(student=self.student).exists())

    def test_scan_refused_on_declared_holiday(self):
        AttendanceSession.objects.create(
            bus=self.bus, date=self.today, slot="MORNING", opened_at=timezone.now())
        AttendanceQRToken.objects.create(
            bus=self.bus, date=self.today, slot="MORNING", token="guard-token-26",
            expires_at=timezone.now() + timedelta(minutes=5))
        Holiday.objects.create(date=self.today)
        self.client.force_authenticate(self.student_user)
        with patch("attendance.qr_views._slot_window_end",
                   return_value=timezone.now() + timedelta(hours=1)):
            r = self.client.post("/api/attendance/qr/scan/",
                                 {"token": "guard-token-26", "embedding": [0.1] * 128}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("holiday", r.data["detail"].lower())
        self.assertFalse(AttendanceRecord.objects.filter(student=self.student).exists())
