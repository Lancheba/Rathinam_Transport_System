from django.test import TestCase
from django.utils import timezone
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status

from attendance.models import AttendanceSession, AttendanceRecord, AttendanceAudit
from buses.models import Bus
from students.models import Student

MANUAL_URL = '/api/attendance/qr/manual/'


def make_user(username, role):
    u = User.objects.create_user(username, password='pass')
    u.profile.role = role
    u.profile.save()
    return u


class AuditTrailTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff = make_user('staff1', 'STAFF')
        self.incharge = make_user('ic1', 'INCHARGE')
        self.bus = Bus.objects.create(
            bus_number='BUS-01', route='X', departure_time='08:00',
            length_m=10.0, width_m=2.5, rfid_uid='RFID-01',
            incharge=self.incharge,
        )
        self.student = Student.objects.create(
            roll_number='R001', name='Alice', bus=self.bus
        )
        self.session = AttendanceSession.objects.create(
            bus=self.bus, date=timezone.localdate(), slot='MORNING',
            opened_at=timezone.now(),
        )
        self.record = AttendanceRecord.objects.create(
            session=self.session, person_type='STUDENT', student=self.student,
            status='ABSENT', source='AUTO_ABSENT', marked_at=timezone.now(),
        )

    # --- attendance_correct ---

    def test_correct_requires_remark(self):
        self.client.force_authenticate(user=self.staff)
        url = f'/api/attendance/records/{self.record.pk}/correct/'
        r = self.client.patch(url, {'remark': 'short'}, format='json')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_correct_writes_audit_row(self):
        self.client.force_authenticate(user=self.staff)
        url = f'/api/attendance/records/{self.record.pk}/correct/'
        r = self.client.patch(url, {'remark': 'Student was present, face failed'}, format='json')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        audit = AttendanceAudit.objects.filter(record=self.record)
        self.assertEqual(audit.count(), 1)
        a = audit.first()
        self.assertEqual(a.action, 'CORRECT')
        self.assertEqual(a.old_status, 'ABSENT')
        self.assertEqual(a.new_status, 'PRESENT')
        self.assertEqual(a.actor, self.staff)
        self.assertEqual(a.reason, 'Student was present, face failed')

    def test_audit_row_is_append_only(self):
        self.client.force_authenticate(user=self.staff)
        url = f'/api/attendance/records/{self.record.pk}/correct/'
        self.client.patch(url, {'remark': 'Student was present, face failed'}, format='json')
        audit = AttendanceAudit.objects.get(record=self.record)
        with self.assertRaises(ValueError):
            audit.reason = 'tampered'
            audit.save()

    def test_audit_row_cannot_be_deleted(self):
        self.client.force_authenticate(user=self.staff)
        url = f'/api/attendance/records/{self.record.pk}/correct/'
        self.client.patch(url, {'remark': 'Student was present, face failed'}, format='json')
        audit = AttendanceAudit.objects.get(record=self.record)
        with self.assertRaises(ValueError):
            audit.delete()

    # --- qr_manual_mark ---

    def test_manual_mark_writes_audit_row(self):
        self.client.force_authenticate(user=self.incharge)
        r = self.client.post(MANUAL_URL, {
            'student_id': self.student.pk,
            'remark': 'Face failed in poor light',
        }, format='json')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        audit = AttendanceAudit.objects.filter(record__student=self.student)
        self.assertEqual(audit.count(), 1)
        a = audit.first()
        self.assertEqual(a.action, 'MANUAL')
        self.assertEqual(a.new_status, 'PRESENT')
        self.assertEqual(a.actor, self.incharge)

    def test_two_corrections_produce_two_audit_rows(self):
        self.client.force_authenticate(user=self.staff)
        url = f'/api/attendance/records/{self.record.pk}/correct/'
        self.client.patch(url, {'remark': 'Student was present, face failed'}, format='json')
        # reset to absent so we can correct again
        self.record.status = 'ABSENT'
        self.record.save(update_fields=['status'])
        self.client.patch(url, {'remark': 'Confirmed by attendance sheet'}, format='json')
        self.assertEqual(AttendanceAudit.objects.filter(record=self.record).count(), 2)
