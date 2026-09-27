"""
Tests for the combined-bus (CabCombination) feature -- Fix Plan item #2.

Covers:
  (a) staff can create a 2-bus and a 3-bus combination
  (b) a student from the partner bus is accepted scanning the other bus's QR
      while the combination is active
  (c) that same student is rejected once the combination is ended
  (d) a student on NEITHER combined bus is still rejected
  (e) attendance lands under the student's OWN bus/session, never double-counted
  (f) unauthorized users cannot create or end combinations
"""
from datetime import date, timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APITestCase

from attendance.models import (
    AttendanceQRToken, AttendanceRecord, AttendanceSession, CabCombination,
)
from buses.models import Bus
from students.models import FaceProfile, Student

COMBINATIONS_URL = "/api/attendance/combinations/"
SCAN_URL = "/api/attendance/qr/scan/"
EMBEDDING = [0.1] * 128
TODAY = date.today()


def make_user(username, role):
    u = User.objects.create_user(username, password="pass1234")
    u.profile.role = role
    u.profile.save()
    return u


def make_bus(number):
    return Bus.objects.create(
        bus_number=number, route="Combo route", rfid_uid=f"RFID-{number}",
        departure_time="08:00", length_m="10.00", width_m="2.50",
    )


def make_riding_student(roll, bus):
    """A student on `bus` with a linked user and a face profile, ready to scan."""
    user = User.objects.create_user(f"user_{roll}", password="pass1234")
    user.profile.role = "STUDENT"
    user.profile.save()
    student = Student.objects.create(
        roll_number=roll, name=f"Student {roll}", bus=bus, linked_user=user,
    )
    FaceProfile.objects.create(student=student, embedding=EMBEDDING, consent_given=True)
    return student, user


class CabCombinationCreateTests(APITestCase):
    """(a) staff can create combinations; (f) non-staff cannot."""

    def setUp(self):
        self.staff = make_user("combo_staff", "STAFF")
        self.student_user = make_user("combo_plain_student", "STUDENT")
        self.bus_a = make_bus("CMBA")
        self.bus_b = make_bus("CMBB")
        self.bus_c = make_bus("CMBC")

    def test_staff_can_create_a_two_bus_combination(self):
        self.client.force_authenticate(self.staff)
        r = self.client.post(COMBINATIONS_URL, {
            "buses": [self.bus_a.pk, self.bus_b.pk],
            "date": str(TODAY),
            "reason": "Saturday low turnout",
        }, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        combo = CabCombination.objects.get(pk=r.data["id"])
        self.assertEqual(set(combo.buses.values_list("pk", flat=True)), {self.bus_a.pk, self.bus_b.pk})
        self.assertTrue(combo.is_active)
        self.assertEqual(combo.created_by, self.staff)

    def test_staff_can_create_a_three_bus_combination(self):
        self.client.force_authenticate(self.staff)
        r = self.client.post(COMBINATIONS_URL, {
            "buses": [self.bus_a.pk, self.bus_b.pk, self.bus_c.pk],
            "date": str(TODAY),
        }, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        combo = CabCombination.objects.get(pk=r.data["id"])
        self.assertEqual(
            set(combo.buses.values_list("pk", flat=True)),
            {self.bus_a.pk, self.bus_b.pk, self.bus_c.pk},
        )

    def test_unauthorized_user_cannot_create_a_combination(self):
        self.client.force_authenticate(self.student_user)
        r = self.client.post(COMBINATIONS_URL, {
            "buses": [self.bus_a.pk, self.bus_b.pk],
            "date": str(TODAY),
        }, format="json")
        self.assertEqual(r.status_code, 403)
        self.assertEqual(CabCombination.objects.count(), 0)

    def test_anonymous_user_cannot_create_a_combination(self):
        r = self.client.post(COMBINATIONS_URL, {
            "buses": [self.bus_a.pk, self.bus_b.pk],
            "date": str(TODAY),
        }, format="json")
        self.assertIn(r.status_code, (401, 403))
        self.assertEqual(CabCombination.objects.count(), 0)


class CabCombinationScanTests(APITestCase):
    """(b), (c), (d), (e): the actual cross-bus scanning behaviour."""

    def setUp(self):
        cache.clear()
        self.staff = make_user("combo_staff2", "STAFF")
        self.plain_student_user = make_user("combo_plain2", "STUDENT")

        self.bus_a = make_bus("CMB2A")
        self.bus_b = make_bus("CMB2B")
        self.bus_other = make_bus("CMB2X")  # not part of the combination

        self.student_a, self.user_a = make_riding_student("CMB2-A1", self.bus_a)
        self.student_b, self.user_b = make_riding_student("CMB2-B1", self.bus_b)
        self.student_other, self.user_other = make_riding_student("CMB2-X1", self.bus_other)

        self.combination = CabCombination.objects.create(
            date=TODAY, reason="Test combination", created_by=self.staff,
        )
        self.combination.buses.set([self.bus_a, self.bus_b])

        # Bus A's in-charge issues a live QR token; students scan against it.
        self.token = AttendanceQRToken.objects.create(
            bus=self.bus_a, date=TODAY, slot="MORNING", token="combo-token-0001",
            expires_at=timezone.now() + timedelta(minutes=5),
        )

        # Keep the window "open" and the day a "school day" regardless of when
        # this test actually runs (see Fix Plan item #1).
        window_patcher = patch(
            "attendance.qr_views._slot_window_end",
            return_value=timezone.now() + timedelta(hours=1),
        )
        window_patcher.start()
        self.addCleanup(window_patcher.stop)
        day_patcher = patch("attendance.qr_views.is_school_day", return_value=True)
        day_patcher.start()
        self.addCleanup(day_patcher.stop)

    def _scan_as(self, user, token=None):
        cache.clear()  # scan is throttled
        self.client.force_authenticate(user)
        return self.client.post(SCAN_URL, {
            "token": (token or self.token).token, "embedding": EMBEDDING,
        }, format="json")

    def test_partner_bus_student_can_scan_while_combination_active(self):
        r = self._scan_as(self.user_b)
        self.assertEqual(r.status_code, 200, r.data)

    def test_partner_bus_student_attendance_lands_on_their_own_bus(self):
        self._scan_as(self.user_b)
        own_session = AttendanceSession.objects.get(bus=self.bus_b, date=TODAY, slot="MORNING")
        record = AttendanceRecord.objects.get(student=self.student_b)
        self.assertEqual(record.session_id, own_session.pk)
        self.assertEqual(record.status, "PRESENT")
        # Never recorded against the bus whose QR was physically scanned.
        self.assertFalse(
            AttendanceRecord.objects.filter(
                student=self.student_b, session__bus=self.bus_a,
            ).exists()
        )

    def test_partner_bus_student_is_not_double_counted(self):
        self._scan_as(self.user_b)
        self.assertEqual(
            AttendanceRecord.objects.filter(student=self.student_b).count(), 1,
        )

    def test_student_not_on_either_combined_bus_is_rejected(self):
        r = self._scan_as(self.user_other)
        self.assertEqual(r.status_code, 400)
        self.assertIn("isn't for your bus", r.data["detail"])
        self.assertFalse(AttendanceRecord.objects.filter(student=self.student_other).exists())

    def test_scanning_is_blocked_again_once_combination_ends(self):
        self.client.force_authenticate(self.staff)
        end_url = f"/api/attendance/combinations/{self.combination.pk}/"
        r = self.client.delete(end_url)
        self.assertEqual(r.status_code, 200, r.data)
        self.combination.refresh_from_db()
        self.assertFalse(self.combination.is_active)

        r = self._scan_as(self.user_b)
        self.assertEqual(r.status_code, 400)
        self.assertIn("isn't for your bus", r.data["detail"])
        self.assertFalse(AttendanceRecord.objects.filter(student=self.student_b).exists())

    def test_unauthorized_user_cannot_end_a_combination(self):
        self.client.force_authenticate(self.plain_student_user)
        end_url = f"/api/attendance/combinations/{self.combination.pk}/"
        r = self.client.delete(end_url)
        self.assertEqual(r.status_code, 403)
        self.combination.refresh_from_db()
        self.assertTrue(self.combination.is_active)

    def test_ending_an_already_ended_combination_is_a_404(self):
        self.combination.is_active = False
        self.combination.save(update_fields=["is_active"])
        self.client.force_authenticate(self.staff)
        end_url = f"/api/attendance/combinations/{self.combination.pk}/"
        r = self.client.delete(end_url)
        self.assertEqual(r.status_code, 404)


class CabCombinationListTests(APITestCase):
    """GET returns only today's/queried active combinations."""

    def setUp(self):
        self.staff = make_user("combo_staff3", "STAFF")
        self.bus_a = make_bus("CMB3A")
        self.bus_b = make_bus("CMB3B")

    def test_list_returns_active_combinations_for_the_date(self):
        combo = CabCombination.objects.create(date=TODAY, created_by=self.staff)
        combo.buses.set([self.bus_a, self.bus_b])
        self.client.force_authenticate(self.staff)
        r = self.client.get(COMBINATIONS_URL, {"date": str(TODAY)})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]["id"], combo.pk)

    def test_list_excludes_ended_combinations(self):
        combo = CabCombination.objects.create(date=TODAY, created_by=self.staff, is_active=False)
        combo.buses.set([self.bus_a, self.bus_b])
        self.client.force_authenticate(self.staff)
        r = self.client.get(COMBINATIONS_URL, {"date": str(TODAY)})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 0)
