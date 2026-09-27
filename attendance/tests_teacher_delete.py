from datetime import date
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from attendance.models import AttendanceSession, AttendanceRecord, AttendanceAudit, Teacher
from buses.models import Bus

User = get_user_model()


def make_bus(bus_number):
    return Bus.objects.create(
        bus_number=bus_number,
        route=f"Route for {bus_number}",
        rfid_uid=f"RFID-TCH-{bus_number}",
        departure_time="08:00",
        length_m="10.00",
        width_m="2.50",
    )


class DeleteTeacherTests(APITestCase):
    """
    Deleting a teacher must work regardless of attendance history:
    AttendanceRecord.teacher is SET_NULL (migration 0018) so the FK is nulled,
    the audit trail is preserved, and the immutable-audit trigger is never touched.
    """

    def setUp(self):
        self.admin = User.objects.create_superuser("admin_tch_del", password="pw")
        self.bus = make_bus("T1")
        self.teacher = Teacher.objects.create(
            name="Del Teacher", staff_id="TCH001", bus=self.bus
        )

    def test_delete_teacher_with_history_returns_204_and_nulls_fk(self):
        session = AttendanceSession.objects.create(
            bus=self.bus, date=date.today(), slot="MORNING"
        )
        record = AttendanceRecord.objects.create(
            session=session, person_type="TEACHER", teacher=self.teacher,
            status="PRESENT",
        )
        AttendanceAudit.objects.create(
            record=record, action="CREATE", new_status="PRESENT",
            actor=self.admin, session=session,
        )
        self.client.force_authenticate(user=self.admin)
        url = f"/api/attendance/teachers/{self.teacher.id}/"
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Teacher.objects.filter(id=self.teacher.id).exists())
        # Record survives; FK is nulled
        record.refresh_from_db()
        self.assertIsNone(record.teacher_id)
        self.assertTrue(AttendanceAudit.objects.filter(record=record).exists())

    def test_delete_teacher_without_history_returns_204(self):
        self.client.force_authenticate(user=self.admin)
        url = f"/api/attendance/teachers/{self.teacher.id}/"
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Teacher.objects.filter(id=self.teacher.id).exists())
