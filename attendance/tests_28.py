from unittest.mock import patch

from django.utils import timezone
from rest_framework.test import APITestCase

from attendance.models import AttendanceRecord, AttendanceSession, Teacher
from attendance.tests_26 import make_bus, make_user
from students.models import Student


class QRTallyMatchesRosterTests(APITestCase):
    def setUp(self):
        self.incharge = make_user("ic28", "INCHARGE")
        self.other_incharge = make_user("ic28b", "INCHARGE")
        self.bus = make_bus("T28A", self.incharge)
        self.other_bus = make_bus("T28B", self.other_incharge)
        self.students = [
            Student.objects.create(roll_number=f"T28{i}", name=f"S{i}", bus=self.bus)
            for i in range(4)
        ]
        Student.objects.create(roll_number="T28X", name="Elsewhere", bus=self.other_bus)
        self.teacher = Teacher.objects.create(name="Mr T", staff_id="T28T", bus=self.bus)
        self.client.force_authenticate(self.incharge)
        patcher = patch("attendance.qr_views._current_slot", return_value="MORNING")
        patcher.start()
        self.addCleanup(patcher.stop)

    def _mark(self, person, status="PRESENT"):
        session = AttendanceSession.objects.get(bus=self.bus, date=timezone.localdate(), slot="MORNING")
        kwargs = {"student": person} if isinstance(person, Student) else {"teacher": person}
        AttendanceRecord.objects.create(
            session=session, person_type="STUDENT" if isinstance(person, Student) else "TEACHER",
            status=status, source="QR_FACE", marked_at=timezone.now(), **kwargs)

    def test_generate_total_is_the_roster_size(self):
        r = self.client.post("/api/attendance/qr/generate/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["total_count"], 4)
        self.assertEqual(r.data["present_count"], 0)

    def test_tally_before_any_session_still_shows_roster(self):
        r = self.client.get("/api/attendance/qr/tally/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual((r.data["present_count"], r.data["total_count"]), (0, 4))

    def test_tally_counts_present_students_against_the_roster(self):
        self.client.post("/api/attendance/qr/generate/")
        self._mark(self.students[0])
        self._mark(self.students[1])
        r = self.client.get("/api/attendance/qr/tally/")
        self.assertEqual((r.data["present_count"], r.data["total_count"]), (2, 4))

    def test_absent_records_do_not_count_as_present(self):
        self.client.post("/api/attendance/qr/generate/")
        self._mark(self.students[0], status="ABSENT")
        r = self.client.get("/api/attendance/qr/tally/")
        self.assertEqual((r.data["present_count"], r.data["total_count"]), (0, 4))

    def test_teachers_are_not_counted_in_the_student_tally(self):
        self.client.post("/api/attendance/qr/generate/")
        self._mark(self.teacher)
        r = self.client.get("/api/attendance/qr/tally/")
        self.assertEqual((r.data["present_count"], r.data["total_count"]), (0, 4))
