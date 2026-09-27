"""
Same issue as students/tests.py::DeleteStudentWithAttendanceHistoryTests:
AttendanceRecord.teacher and AttendanceAudit.record are both
on_delete=CASCADE, but migration 0010's Postgres trigger makes
AttendanceAudit rows immutable even against a cascaded DELETE. Deleting a
teacher with attendance history used to raise a raw InternalError mid-cascade
-- an unhandled 500 in production -- instead of a clean 400.
"""
from datetime import date

from rest_framework.test import APITestCase

from .models import AttendanceRecord, AttendanceSession, Teacher
from .tests import make_bus, make_user


class DeleteTeacherWithAttendanceHistoryTests(APITestCase):
    def setUp(self):
        self.admin = make_user("teach_del_admin", None)
        self.admin.is_staff = True
        self.admin.save(update_fields=["is_staff"])
        self.bus = make_bus("TDEL1")
        self.client.force_authenticate(self.admin)

    def test_cannot_delete_teacher_with_attendance_history(self):
        teacher = Teacher.objects.create(name="Has History", staff_id="TDELHIST1", bus=self.bus)
        session = AttendanceSession.objects.create(bus=self.bus, date=date.today(), slot="MORNING")
        AttendanceRecord.objects.create(
            session=session, person_type="TEACHER", teacher=teacher, status="PRESENT",
        )

        res = self.client.delete(f"/api/attendance/teachers/{teacher.pk}/")
        self.assertEqual(res.status_code, 400)
        self.assertTrue(Teacher.objects.filter(pk=teacher.pk).exists())

    def test_can_delete_teacher_with_no_attendance_history(self):
        teacher = Teacher.objects.create(name="Clean Slate", staff_id="TDELNOHIST1", bus=self.bus)

        res = self.client.delete(f"/api/attendance/teachers/{teacher.pk}/")
        self.assertEqual(res.status_code, 204)
        self.assertFalse(Teacher.objects.filter(pk=teacher.pk).exists())
