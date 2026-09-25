from django.test import TestCase
from django.utils import timezone
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status

from attendance.models import AttendanceSession, AttendanceRecord
from buses.models import Bus
from students.models import Student

SUBMIT_URL = '/api/attendance/submit/'


def make_staff():
    u = User.objects.create_user('staff1', password='pass')
    u.profile.role = 'STAFF'
    u.profile.save()
    return u


class AttendanceSubmitProtectionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff = make_staff()
        self.client.force_authenticate(user=self.staff)
        self.bus = Bus.objects.create(
            bus_number='BUS-01', route='X', departure_time='08:00',
            length_m=10.0, width_m=2.5,
        )
        self.s1 = Student.objects.create(
            roll_number='R001', name='Alice', bus=self.bus
        )
        self.s2 = Student.objects.create(
            roll_number='R002', name='Bob', bus=self.bus
        )
        self.today = str(timezone.localdate())
        self.session = AttendanceSession.objects.create(
            bus=self.bus, date=timezone.localdate(), slot='MORNING',
            opened_at=timezone.now(),
        )
        # s1 already scanned via QR/face
        AttendanceRecord.objects.create(
            session=self.session, person_type='STUDENT', student=self.s1,
            status='PRESENT', source='QR_FACE', marked_at=timezone.now(),
        )

    def _submit(self, is_holiday=False, records=None, holiday_reason=''):
        payload = {
            'bus': self.bus.pk,
            'date': self.today,
            'slot': 'MORNING',
            'is_holiday': is_holiday,
            'holiday_reason': holiday_reason,
            'records': records or [],
        }
        return self.client.post(SUBMIT_URL, payload, format='json')

    # --- holiday path ---

    def test_holiday_blocked_when_present_records_exist(self):
        r = self._submit(is_holiday=True, holiday_reason='Pongal')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('PRESENT', r.data['detail'])

    def test_holiday_allowed_when_no_present_records(self):
        # remove the present record first
        AttendanceRecord.objects.filter(session=self.session, student=self.s1).delete()
        r = self._submit(is_holiday=True, holiday_reason='Pongal')
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_holiday_keeps_absent_rows_and_never_deletes(self):
        # add an absent row for s2
        AttendanceRecord.objects.create(
            session=self.session, person_type='STUDENT', student=self.s2,
            status='ABSENT', source='AUTO_ABSENT', marked_at=timezone.now(),
        )
        # remove present so holiday is allowed
        AttendanceRecord.objects.filter(session=self.session, student=self.s1).delete()
        self._submit(is_holiday=True, holiday_reason='Pongal')
        self.assertEqual(AttendanceRecord.objects.filter(session=self.session, status="ABSENT").count(), 1)

    # --- partial submit path ---

    def test_partial_submit_keeps_present_record_not_in_payload(self):
        # submit only s2 as absent, omitting s1 entirely
        r = self._submit(records=[
            {'person_type': 'STUDENT', 'id': self.s2.pk, 'status': 'ABSENT'}
        ])
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        r1 = AttendanceRecord.objects.get(session=self.session, student=self.s1)
        self.assertEqual(r1.status, 'PRESENT')
        self.assertEqual(r1.source, 'QR_FACE')

    def test_partial_submit_cannot_overwrite_present_with_absent(self):
        r = self._submit(records=[
            {'person_type': 'STUDENT', 'id': self.s1.pk, 'status': 'ABSENT'}
        ])
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        r1 = AttendanceRecord.objects.get(session=self.session, student=self.s1)
        self.assertEqual(r1.status, 'PRESENT')

    def test_absent_record_not_in_payload_is_kept(self):
        AttendanceRecord.objects.create(
            session=self.session, person_type='STUDENT', student=self.s2,
            status='ABSENT', source='AUTO_ABSENT', marked_at=timezone.now(),
        )
        # submit only s1; s2's absent record must stay (deleting it would also
        # erase its audit trail through the cascade)
        self._submit(records=[
            {'person_type': 'STUDENT', 'id': self.s1.pk, 'status': 'PRESENT'}
        ])
        self.assertTrue(
            AttendanceRecord.objects.filter(session=self.session, student=self.s2).exists()
        )
