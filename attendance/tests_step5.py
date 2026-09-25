from datetime import date

from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status

from buses.models import Bus
from students.models import Student
from attendance.models import AttendanceRecord, AttendanceSession


def make_admin(name):
    u = User.objects.create_user(name, password="pass1234")
    u.profile.role = "ADMIN"
    u.profile.save()
    return u


class ExportColumnsTests(APITestCase):
    def test_export_csv_has_slot_source_remarks_columns(self):
        admin = make_admin("step5admin_exp")
        bus = Bus.objects.create(
            bus_number="EXP1", route="Export test route", rfid_uid="RFID-EXP1",
            departure_time="08:00", length_m="10.00", width_m="2.50",
        )
        student = Student.objects.create(name="Exp Student", roll_number="EXP001", bus=bus)
        session = AttendanceSession.objects.create(bus=bus, date=date(2026, 9, 1), slot="MORNING")
        AttendanceRecord.objects.create(
            session=session, person_type="STUDENT", student=student,
            status="PRESENT", source="QR", remarks="on time",
        )
        self.client.force_authenticate(admin)
        r = self.client.get(f"/api/attendance/export/?bus={bus.id}&filetype=csv")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        body = r.content.decode()
        header = body.splitlines()[0]
        self.assertIn("Slot", header)
        self.assertIn("Source", header)
        self.assertIn("Remarks", header)
        self.assertIn("MORNING", body)
        self.assertIn("QR", body)
        self.assertIn("on time", body)


class MarkedByNotOverwrittenTests(APITestCase):
    def test_second_submit_keeps_original_marked_by(self):
        first_admin = make_admin("step5admin_mb1")
        second_admin = make_admin("step5admin_mb2")
        bus = Bus.objects.create(
            bus_number="MB1", route="Marked-by test route", rfid_uid="RFID-MB1",
            departure_time="08:00", length_m="10.00", width_m="2.50",
        )
        student = Student.objects.create(name="MB Student", roll_number="MB001", bus=bus)

        self.client.force_authenticate(first_admin)
        payload = {
            "bus": bus.id, "date": "2026-09-02", "slot": "MORNING", "is_holiday": False,
            "records": [{"person_type": "STUDENT", "id": student.pk, "status": "PRESENT"}],
        }
        r1 = self.client.post("/api/attendance/submit/", payload, format="json")
        self.assertEqual(r1.status_code, status.HTTP_200_OK, r1.data)

        self.client.force_authenticate(second_admin)
        payload["records"][0]["status"] = "ABSENT"
        r2 = self.client.post("/api/attendance/submit/", payload, format="json")
        self.assertEqual(r2.status_code, status.HTTP_200_OK, r2.data)

        session = AttendanceSession.objects.get(bus=bus, date="2026-09-02", slot="MORNING")
        self.assertEqual(session.marked_by, first_admin)


class StreakPerCalendarDayTests(APITestCase):
    def test_absent_in_both_slots_one_day_counts_as_one_day_streak(self):
        admin = make_admin("step5admin_stk1")
        bus = Bus.objects.create(
            bus_number="STK1", route="Streak test route", rfid_uid="RFID-STK1",
            departure_time="08:00", length_m="10.00", width_m="2.50",
        )
        student = Student.objects.create(name="Streak Student", roll_number="STK001", bus=bus)
        for slot in ("MORNING", "EVENING"):
            session = AttendanceSession.objects.create(bus=bus, date=date(2026, 9, 3), slot=slot)
            AttendanceRecord.objects.create(
                session=session, person_type="STUDENT", student=student, status="ABSENT",
            )
        self.client.force_authenticate(admin)
        r = self.client.get(f"/api/attendance/analytics/student/{student.pk}/?year=2026&month=9")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["longest_absence_streak"], 1)

    def test_absent_on_two_separate_days_counts_as_streak_of_two(self):
        admin = make_admin("step5admin_stk2")
        bus = Bus.objects.create(
            bus_number="STK2", route="Streak test route 2", rfid_uid="RFID-STK2",
            departure_time="08:00", length_m="10.00", width_m="2.50",
        )
        student = Student.objects.create(name="Streak Student 2", roll_number="STK002", bus=bus)
        for day in (4, 5):
            session = AttendanceSession.objects.create(bus=bus, date=date(2026, 9, day), slot="MORNING")
            AttendanceRecord.objects.create(
                session=session, person_type="STUDENT", student=student, status="ABSENT",
            )
        self.client.force_authenticate(admin)
        r = self.client.get(f"/api/attendance/analytics/student/{student.pk}/?year=2026&month=9")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["longest_absence_streak"], 2)
