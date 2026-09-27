"""
Direct unit tests for attendance/detection.py.

tests_34.py already covers the /flags/ list+review API views. These tests
instead call the detection rules themselves (run_detection, log_manual_mark,
log_cross_bus_scan) directly against a session, so each rule's own trigger
condition, idempotency guard, and helper behaviour is actually exercised --
this is the item #6 audit gap (detection.py sat at 17% coverage).
"""
from datetime import date, timedelta
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.utils import timezone

from buses.models import Bus
from students.models import Student

from .detection import (
    _create_flag,
    log_cross_bus_scan,
    log_manual_mark,
    run_detection,
)
from .models import AttendanceAudit, AttendanceFlag, AttendanceRecord, AttendanceSession
from .tests import make_bus


class DetectionTestBase(TestCase):
    def setUp(self):
        self.bus = make_bus("DET1")
        self.other_bus = make_bus("DET2")
        self.session = AttendanceSession.objects.create(bus=self.bus, date=date.today(), slot="MORNING")
        self.students = [
            Student.objects.create(name=f"Student {i}", roll_number=f"DR{i}", bus=self.bus)
            for i in range(5)
        ]

    def _record(self, student, status="PRESENT", source="MANUAL", marked_at=None):
        return AttendanceRecord.objects.create(
            session=self.session, person_type="STUDENT", student=student,
            status=status, source=source, marked_at=marked_at,
        )


class CreateFlagIdempotencyTests(DetectionTestBase):
    def test_create_flag_returns_none_when_already_open(self):
        first = _create_flag(self.session, "SAME_IP_BURST", "HIGH", {"n": 1})
        self.assertIsNotNone(first)
        second = _create_flag(self.session, "SAME_IP_BURST", "HIGH", {"n": 2})
        self.assertIsNone(second)
        self.assertEqual(AttendanceFlag.objects.filter(session=self.session, rule="SAME_IP_BURST").count(), 1)

    def test_create_flag_attaches_records(self):
        record = self._record(self.students[0])
        flag = _create_flag(self.session, "HOLIDAY_ATTENDANCE", "HIGH", {}, records=[record.pk])
        self.assertIn(record, flag.records.all())


class SameDeviceRuleTests(DetectionTestBase):
    @override_settings(FLAG_SAME_DEVICE_THRESHOLD=3)
    def test_flags_when_one_device_scans_many_students(self):
        records = [self._record(s, source="QR_FACE") for s in self.students[:3]]
        for r in records:
            AttendanceAudit.objects.create(
                record=r, session=self.session, action="SCAN", new_status="PRESENT", device_id="device-x",
            )
        run_detection(self.session)
        self.assertTrue(
            AttendanceFlag.objects.filter(session=self.session, rule="SAME_DEVICE_MANY_STUDENTS").exists()
        )

    @override_settings(FLAG_SAME_DEVICE_THRESHOLD=3)
    def test_no_flag_below_threshold(self):
        records = [self._record(s, source="QR_FACE") for s in self.students[:2]]
        for r in records:
            AttendanceAudit.objects.create(
                record=r, session=self.session, action="SCAN", new_status="PRESENT", device_id="device-x",
            )
        run_detection(self.session)
        self.assertFalse(
            AttendanceFlag.objects.filter(session=self.session, rule="SAME_DEVICE_MANY_STUDENTS").exists()
        )


class IpBurstRuleTests(DetectionTestBase):
    @override_settings(FLAG_IP_BURST_WINDOW_SECONDS=30, FLAG_IP_BURST_THRESHOLD=3)
    def test_flags_burst_from_same_ip(self):
        now = timezone.now()
        for i, student in enumerate(self.students[:3]):
            r = self._record(student, source="QR_FACE")
            audit = AttendanceAudit.objects.create(
                record=r, session=self.session, action="SCAN", new_status="PRESENT", ip_address="10.0.0.5",
            )
            AttendanceAudit.objects.filter(pk=audit.pk).update(created_at=now + timedelta(seconds=i))
        run_detection(self.session)
        flag = AttendanceFlag.objects.get(session=self.session, rule="SAME_IP_BURST")
        self.assertEqual(flag.detail["ip"], "10.0.0.5")

    @override_settings(FLAG_IP_BURST_WINDOW_SECONDS=5, FLAG_IP_BURST_THRESHOLD=3)
    def test_no_flag_when_spread_out(self):
        now = timezone.now()
        for i, student in enumerate(self.students[:3]):
            r = self._record(student, source="QR_FACE")
            audit = AttendanceAudit.objects.create(
                record=r, session=self.session, action="SCAN", new_status="PRESENT", ip_address="10.0.0.6",
            )
            AttendanceAudit.objects.filter(pk=audit.pk).update(created_at=now + timedelta(seconds=i * 60))
        run_detection(self.session)
        self.assertFalse(AttendanceFlag.objects.filter(session=self.session, rule="SAME_IP_BURST").exists())


class ManualShareRuleTests(DetectionTestBase):
    @override_settings(FLAG_MANUAL_SHARE_RATIO=0.4)
    def test_flags_high_manual_share(self):
        for s in self.students[:3]:
            self._record(s, source="MANUAL")
        for s in self.students[3:5]:
            self._record(s, source="QR_FACE")
        run_detection(self.session)
        flag = AttendanceFlag.objects.get(session=self.session, rule="MANUAL_MARK_SHARE_HIGH")
        self.assertEqual(flag.detail["manual"], 3)
        self.assertEqual(flag.detail["total"], 5)

    def test_no_flag_when_no_records(self):
        run_detection(self.session)
        self.assertFalse(AttendanceFlag.objects.filter(session=self.session, rule="MANUAL_MARK_SHARE_HIGH").exists())


class InstantPresentRuleTests(DetectionTestBase):
    @override_settings(FLAG_INSTANT_PRESENT_SECONDS=60)
    def test_flags_when_everyone_marked_within_window(self):
        now = timezone.now()
        for i, s in enumerate(self.students[:3]):
            self._record(s, status="PRESENT", marked_at=now + timedelta(seconds=i * 5))
        run_detection(self.session)
        self.assertTrue(
            AttendanceFlag.objects.filter(session=self.session, rule="SESSION_INSTANT_PRESENT").exists()
        )

    def test_no_flag_with_fewer_than_three_present(self):
        now = timezone.now()
        self._record(self.students[0], status="PRESENT", marked_at=now)
        self._record(self.students[1], status="PRESENT", marked_at=now)
        run_detection(self.session)
        self.assertFalse(
            AttendanceFlag.objects.filter(session=self.session, rule="SESSION_INSTANT_PRESENT").exists()
        )

    @override_settings(FLAG_INSTANT_PRESENT_SECONDS=5)
    def test_no_flag_when_spread_beyond_window(self):
        now = timezone.now()
        for i, s in enumerate(self.students[:3]):
            self._record(s, status="PRESENT", marked_at=now + timedelta(seconds=i * 60))
        run_detection(self.session)
        self.assertFalse(
            AttendanceFlag.objects.filter(session=self.session, rule="SESSION_INSTANT_PRESENT").exists()
        )


class HolidayAttendanceRuleTests(DetectionTestBase):
    def test_flags_present_record_on_holiday(self):
        self.session.is_holiday = True
        self.session.save(update_fields=["is_holiday"])
        self._record(self.students[0], status="PRESENT")
        run_detection(self.session)
        flag = AttendanceFlag.objects.get(session=self.session, rule="HOLIDAY_ATTENDANCE")
        self.assertEqual(flag.detail["present_count"], 1)

    def test_no_flag_when_not_a_holiday(self):
        self._record(self.students[0], status="PRESENT")
        run_detection(self.session)
        self.assertFalse(AttendanceFlag.objects.filter(session=self.session, rule="HOLIDAY_ATTENDANCE").exists())

    def test_no_flag_on_holiday_with_no_present_records(self):
        self.session.is_holiday = True
        self.session.save(update_fields=["is_holiday"])
        run_detection(self.session)
        self.assertFalse(AttendanceFlag.objects.filter(session=self.session, rule="HOLIDAY_ATTENDANCE").exists())


class RunDetectionErrorHandlingTests(DetectionTestBase):
    def test_run_detection_never_raises(self):
        with patch("attendance.detection._check_same_device", side_effect=RuntimeError("boom")):
            try:
                run_detection(self.session)
            except Exception:  # pragma: no cover - the whole point is this must not happen
                self.fail("run_detection() must swallow rule errors, not raise")


class LogManualMarkTests(DetectionTestBase):
    def test_logs_flag_for_student_record(self):
        record = self._record(self.students[0], status="PRESENT")
        record.remarks = "Late arrival"
        record.save(update_fields=["remarks"])
        log_manual_mark(record)
        flag = AttendanceFlag.objects.get(rule="MANUAL_MARK_LOGGED", session=self.session)
        self.assertEqual(flag.detail["person"], self.students[0].name)
        self.assertEqual(flag.detail["remarks"], "Late arrival")
        self.assertIn(record, flag.records.all())

    def test_unknown_person_falls_back(self):
        record = AttendanceRecord.objects.create(
            session=self.session, person_type="STUDENT", student=None, status="PRESENT",
        )
        log_manual_mark(record)
        flag = AttendanceFlag.objects.filter(rule="MANUAL_MARK_LOGGED").latest("id")
        self.assertEqual(flag.detail["person"], "Unknown")


class LogCrossBusScanTests(DetectionTestBase):
    def test_logs_cross_bus_scan_with_bus_numbers(self):
        record = self._record(self.students[0], status="PRESENT")
        log_cross_bus_scan(record, qr_bus_id=self.other_bus.pk)
        flag = AttendanceFlag.objects.get(rule="CROSS_BUS_SCAN", session=self.session)
        self.assertEqual(flag.detail["own_bus"], self.bus.bus_number)
        self.assertEqual(flag.detail["scanned_bus"], self.other_bus.bus_number)
        self.assertIn(record, flag.records.all())

    def test_handles_unknown_qr_bus_id(self):
        record = self._record(self.students[0], status="PRESENT")
        log_cross_bus_scan(record, qr_bus_id=999999)
        flag = AttendanceFlag.objects.get(rule="CROSS_BUS_SCAN", session=self.session)
        self.assertIsNone(flag.detail["scanned_bus"])
