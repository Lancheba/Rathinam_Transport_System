from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APITestCase

from attendance.models import (
    AttendanceQRToken, AttendanceRecord, AttendanceSession, Teacher,
)
from buses.models import Bus
from students.models import Student

SUBMIT_URL = "/api/attendance/submit/"
SCAN_URL = "/api/attendance/qr/scan/"
MANUAL_URL = "/api/attendance/qr/manual/"
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


class SubmitValidationTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.today = timezone.localdate()
        self.staff = make_user("staff25", "STAFF")
        self.admin = make_user("admin25", "ADMIN")
        self.incharge = make_user("ic25", "INCHARGE")
        self.incharge2 = make_user("ic25b", "INCHARGE")
        self.student_user = make_user("stu25", "STUDENT")

        self.bus = make_bus("V25A", self.incharge)
        self.other_bus = make_bus("V25B", self.incharge2)

        self.student = Student.objects.create(
            roll_number="V001", name="Alice", bus=self.bus, linked_user=self.student_user
        )
        self.other_student = Student.objects.create(
            roll_number="V002", name="Bob", bus=self.other_bus
        )
        self.teacher = Teacher.objects.create(name="Mr T", staff_id="T25", bus=self.bus)

        self.session = AttendanceSession.objects.create(
            bus=self.bus, date=self.today, slot="MORNING", opened_at=timezone.now(),
        )

        patcher = patch(
            "attendance.qr_views._slot_window_end",
            return_value=timezone.now() + timedelta(hours=1),
        )
        patcher.start()
        self.addCleanup(patcher.stop)

    def _submit(self, user=None, **overrides):
        self.client.force_authenticate(user or self.staff)
        body = {
            "bus": self.bus.pk,
            "date": str(self.today),
            "slot": "MORNING",
            "records": [{"person_type": "STUDENT", "id": self.student.pk, "status": "ABSENT"}],
        }
        body.update(overrides)
        return self.client.post(SUBMIT_URL, body, format="json")

    # ---- happy path still works ----
    def test_valid_submit_still_works(self):
        r = self._submit()
        self.assertEqual(r.status_code, 200)

    # ---- dates ----
    def test_future_date_rejected(self):
        r = self._submit(date=str(self.today + timedelta(days=1)))
        self.assertEqual(r.status_code, 400)
        self.assertIn("date", r.data)

    def test_old_date_rejected_for_staff(self):
        r = self._submit(date=str(self.today - timedelta(days=40)))
        self.assertEqual(r.status_code, 400)
        self.assertIn("date", r.data)

    def test_old_date_allowed_for_admin(self):
        r = self._submit(user=self.admin, date=str(self.today - timedelta(days=40)))
        self.assertEqual(r.status_code, 200)

    def test_date_inside_backfill_limit_allowed(self):
        r = self._submit(date=str(self.today - timedelta(days=5)))
        self.assertEqual(r.status_code, 200)

    # ---- ids ----
    def test_student_from_other_bus_rejected(self):
        r = self._submit(records=[
            {"person_type": "STUDENT", "id": self.other_student.pk, "status": "PRESENT"},
        ])
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.data["invalid_student_ids"], [self.other_student.pk])
        self.assertFalse(AttendanceRecord.objects.filter(student=self.other_student).exists())

    def test_nonexistent_student_id_returns_400_not_500(self):
        r = self._submit(records=[{"person_type": "STUDENT", "id": 999999, "status": "ABSENT"}])
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.data["invalid_student_ids"], [999999])

    def test_nonexistent_teacher_id_returns_400(self):
        r = self._submit(records=[{"person_type": "TEACHER", "id": 999999, "status": "ABSENT"}])
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.data["invalid_teacher_ids"], [999999])

    def test_valid_teacher_accepted(self):
        r = self._submit(records=[{"person_type": "TEACHER", "id": self.teacher.pk, "status": "ABSENT"}])
        self.assertEqual(r.status_code, 200)

    def test_huge_id_returns_400(self):
        r = self._submit(records=[{"person_type": "STUDENT", "id": 10 ** 12, "status": "ABSENT"}])
        self.assertEqual(r.status_code, 400)

    def test_zero_and_negative_id_return_400(self):
        for bad in (0, -5):
            r = self._submit(records=[{"person_type": "STUDENT", "id": bad, "status": "ABSENT"}])
            self.assertEqual(r.status_code, 400, bad)

    # ---- lengths ----
    def test_long_remarks_rejected(self):
        r = self._submit(records=[
            {"person_type": "STUDENT", "id": self.student.pk, "status": "ABSENT", "remarks": "x" * 201},
        ])
        self.assertEqual(r.status_code, 400)

    def test_long_holiday_reason_rejected(self):
        r = self._submit(is_holiday=True, records=[], holiday_reason="x" * 201)
        self.assertEqual(r.status_code, 400)

    def test_manual_remark_too_long_rejected(self):
        self.client.force_authenticate(self.incharge)
        r = self.client.post(MANUAL_URL, {"student_id": self.student.pk, "remark": "x" * 201}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_correct_remark_too_long_rejected(self):
        rec = AttendanceRecord.objects.create(
            session=self.session, person_type="STUDENT", student=self.student,
            status="ABSENT", source="AUTO_ABSENT", marked_at=timezone.now(),
        )
        self.client.force_authenticate(self.staff)
        r = self.client.patch(f"/api/attendance/records/{rec.pk}/correct/", {"remark": "x" * 201}, format="json")
        self.assertEqual(r.status_code, 400)

    # ---- holidays ----
    def test_scan_rejected_on_holiday(self):
        self.session.is_holiday = True
        self.session.save(update_fields=["is_holiday"])
        AttendanceQRToken.objects.create(
            bus=self.bus, date=self.today, slot="MORNING", token="holiday-token-25",
            expires_at=timezone.now() + timedelta(minutes=5),
        )
        cache.clear()
        self.client.force_authenticate(self.student_user)
        r = self.client.post(SCAN_URL, {"token": "holiday-token-25", "embedding": EMBEDDING}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("holiday", r.data["detail"].lower())
        self.assertFalse(AttendanceRecord.objects.filter(student=self.student).exists())

    def test_manual_mark_rejected_on_holiday(self):
        self.session.is_holiday = True
        self.session.save(update_fields=["is_holiday"])
        self.client.force_authenticate(self.incharge)
        r = self.client.post(
            MANUAL_URL, {"student_id": self.student.pk, "remark": "Face failed in poor light"}, format="json"
        )
        self.assertEqual(r.status_code, 400)
        self.assertFalse(AttendanceRecord.objects.filter(student=self.student).exists())
