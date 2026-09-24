from django.test import TestCase
from django.utils import timezone
from django.contrib.auth.models import User

from attendance.models import AttendanceSession, AttendanceRecord
from attendance.services import finalize_session
from buses.models import Bus
from students.models import Student


class FinalizeSessionTest(TestCase):
    def setUp(self):
        self.bus = Bus.objects.create(
            bus_number='TEST-01',
            route='A to B',
            departure_time='08:00',
            length_m=10.0,
            width_m=2.5,
        )
        self.s1 = Student.objects.create(
            roll_number='R001', name='Alice', bus=self.bus
        )
        self.s2 = Student.objects.create(
            roll_number='R002', name='Bob', bus=self.bus
        )
        self.session = AttendanceSession.objects.create(
            bus=self.bus,
            date=timezone.localdate(),
            slot='MORNING',
            opened_at=timezone.now(),
        )

    def test_both_absent_when_none_scanned(self):
        finalize_session(self.session)
        records = AttendanceRecord.objects.filter(session=self.session)
        self.assertEqual(records.count(), 2)
        self.assertTrue(all(r.status == 'ABSENT' for r in records))
        self.assertTrue(all(r.source == 'AUTO_ABSENT' for r in records))

    def test_scanner_stays_present_non_scanner_gets_absent(self):
        AttendanceRecord.objects.create(
            session=self.session,
            person_type='STUDENT',
            student=self.s1,
            status='PRESENT',
            source='QR_FACE',
            marked_at=timezone.now(),
        )
        finalize_session(self.session)
        r1 = AttendanceRecord.objects.get(session=self.session, student=self.s1)
        r2 = AttendanceRecord.objects.get(session=self.session, student=self.s2)
        self.assertEqual(r1.status, 'PRESENT')
        self.assertEqual(r2.status, 'ABSENT')
        self.assertEqual(r2.source, 'AUTO_ABSENT')

    def test_session_marked_finalized(self):
        finalize_session(self.session)
        self.session.refresh_from_db()
        self.assertTrue(self.session.auto_finalized)
        self.assertIsNotNone(self.session.closed_at)

    def test_idempotent_second_call_no_duplicates(self):
        finalize_session(self.session)
        finalize_session(self.session)
        records = AttendanceRecord.objects.filter(session=self.session)
        self.assertEqual(records.count(), 2)

    def test_qr_stop_also_marks_absent(self):
        from rest_framework.test import APIClient
        user = User.objects.create_user('incharge1', password='pass')
        user.profile.role = 'INCHARGE'
        user.profile.save()
        self.bus.incharge = user
        self.bus.save()
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.post('/api/attendance/qr/stop/')
        self.assertEqual(response.status_code, 200)
        absent = AttendanceRecord.objects.filter(
            session=self.session, status='ABSENT'
        )
        self.assertEqual(absent.count(), 2)
