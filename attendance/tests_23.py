from django.test import TestCase
from django.utils import timezone
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status

from attendance.models import AttendanceSession, AttendanceRecord
from buses.models import Bus
from students.models import Student

MANUAL_URL = '/api/attendance/qr/manual/'


class ManualMarkTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.incharge = User.objects.create_user('ic1', password='pass')
        self.incharge.profile.role = 'INCHARGE'
        self.incharge.profile.save()
        self.bus = Bus.objects.create(
            bus_number='BUS-01', route='X', departure_time='08:00',
            length_m=10.0, width_m=2.5, rfid_uid='RFID-01', incharge=self.incharge,
        )
        self.student = Student.objects.create(
            roll_number='R001', name='Alice', bus=self.bus
        )
        self.session = AttendanceSession.objects.create(
            bus=self.bus, date=timezone.localdate(), slot='MORNING',
            opened_at=timezone.now(),
        )
        self.client.force_authenticate(user=self.incharge)

    def _post(self, student_id=None, remark='Face failed in poor light'):
        return self.client.post(MANUAL_URL, {
            'student_id': student_id or self.student.pk,
            'remark': remark,
        }, format='json')

    def test_incharge_can_mark_present(self):
        r = self._post()
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data['status'], 'PRESENT')
        self.assertEqual(r.data['source'], 'MANUAL')

    def test_record_saved_as_manual(self):
        self._post()
        rec = AttendanceRecord.objects.get(session=self.session, student=self.student)
        self.assertEqual(rec.status, 'PRESENT')
        self.assertEqual(rec.source, 'MANUAL')
        self.assertTrue(rec.is_correction)
        self.assertEqual(rec.corrected_by, self.incharge)

    def test_remark_too_short_returns_400(self):
        r = self._post(remark='short')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_student_id_returns_400(self):
        r = self.client.post(MANUAL_URL, {'remark': 'Face failed in poor light'}, format='json')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_student_on_wrong_bus_returns_404(self):
        other_bus = Bus.objects.create(
            bus_number='BUS-02', route='Y', departure_time='09:00',
            length_m=10.0, width_m=2.5, rfid_uid='RFID-02',
        )
        other_student = Student.objects.create(
            roll_number='R999', name='Zara', bus=other_bus
        )
        r = self._post(student_id=other_student.pk)
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)

    def test_no_open_session_returns_400(self):
        self.session.closed_at = timezone.now()
        self.session.auto_finalized = True
        self.session.save()
        r = self._post()
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_already_present_returns_400(self):
        AttendanceRecord.objects.create(
            session=self.session, person_type='STUDENT', student=self.student,
            status='PRESENT', source='QR_FACE', marked_at=timezone.now(),
        )
        r = self._post()
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_student_forbidden_from_manual_mark(self):
        student_user = User.objects.create_user('stu1', password='pass')
        student_user.profile.role = 'STUDENT'
        student_user.profile.save()
        self.client.force_authenticate(user=student_user)
        r = self._post()
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_driver_forbidden_from_manual_mark(self):
        driver = User.objects.create_user('drv1', password='pass')
        driver.profile.role = 'DRIVER'
        driver.profile.save()
        self.client.force_authenticate(user=driver)
        r = self._post()
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
