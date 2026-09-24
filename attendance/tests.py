from datetime import date, timedelta

from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from buses.models import Bus
from students.models import Student

from .models import AttendanceRecord, AttendanceSession, AttendanceWindowConfig

BUS_FIELDS = {
    "rfid_uid": "RFID-ATT",
    "departure_time": "08:00",
    "length_m": "10.00",
    "width_m": "2.50",
}


def make_user(username, role=None):
    user = User.objects.create_user(username, password="pass1234")
    if role:
        user.profile.role = role
        user.profile.save()
    return user


def make_bus(bus_number):
    return Bus.objects.create(
        bus_number=bus_number, route=f"Route for {bus_number}",
        rfid_uid=f"{BUS_FIELDS['rfid_uid']}-{bus_number}",
        departure_time=BUS_FIELDS["departure_time"],
        length_m=BUS_FIELDS["length_m"], width_m=BUS_FIELDS["width_m"],
    )


class MyAttendanceTests(APITestCase):
    url = "/api/attendance/my/"

    def setUp(self):
        self.bus = make_bus("B20")
        self.alice = Student.objects.create(name="Alice", roll_number="R950", bus=self.bus)
        self.student_user = make_user("alice_att", "STUDENT")
        self.unlinked_user = make_user("bob_att", "STUDENT")
        self.driver = make_user("driver20", "DRIVER")
        self.today = date.today()

    def _link(self):
        self.alice.linked_user = self.student_user
        self.alice.save(update_fields=["linked_user"])

    def test_unlinked_student_gets_linked_false(self):
        self.client.force_authenticate(self.unlinked_user)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data["linked"])

    def test_driver_cannot_call_this_endpoint(self):
        self.client.force_authenticate(self.driver)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 403)

    def test_absent_today_is_reported(self):
        self._link()
        session = AttendanceSession.objects.create(bus=self.bus, date=self.today)
        AttendanceRecord.objects.create(
            session=session, person_type="STUDENT", student=self.alice, status="ABSENT",
        )
        self.client.force_authenticate(self.student_user)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["linked"])
        self.assertEqual(res.data["morning"]["today"]["status"], "ABSENT")
        self.assertTrue(res.data["morning"]["today"]["marked"])

    def test_present_today_is_reported(self):
        self._link()
        session = AttendanceSession.objects.create(bus=self.bus, date=self.today)
        AttendanceRecord.objects.create(
            session=session, person_type="STUDENT", student=self.alice, status="PRESENT",
        )
        self.client.force_authenticate(self.student_user)
        res = self.client.get(self.url)
        self.assertEqual(res.data["morning"]["today"]["status"], "PRESENT")

    def test_holiday_today_is_reported(self):
        self._link()
        AttendanceSession.objects.create(
            bus=self.bus, date=self.today, is_holiday=True, holiday_reason="College holiday",
        )
        self.client.force_authenticate(self.student_user)
        res = self.client.get(self.url)
        self.assertTrue(res.data["morning"]["today"]["is_holiday"])
        self.assertEqual(res.data["morning"]["today"]["holiday_reason"], "College holiday")
        self.assertIsNone(res.data["morning"]["today"]["status"])

    def test_no_session_yet_is_unmarked_not_absent(self):
        self._link()
        self.client.force_authenticate(self.student_user)
        res = self.client.get(self.url)
        self.assertFalse(res.data["morning"]["today"]["marked"])
        self.assertIsNone(res.data["morning"]["today"]["status"])

    def test_student_with_no_bus_gets_unmarked_days(self):
        self.alice.bus = None
        self.alice.save(update_fields=["bus"])
        self._link()
        self.client.force_authenticate(self.student_user)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(res.data["bus_number"])
        self.assertFalse(res.data["morning"]["today"]["marked"])

    def test_recent_history_has_seven_days(self):
        self._link()
        self.client.force_authenticate(self.student_user)
        res = self.client.get(self.url)
        self.assertEqual(len(res.data["morning"]["recent"]), 7)
        self.assertEqual(res.data["morning"]["recent"][0]["date"], str(self.today))

    def test_evening_slot_is_independent_of_morning(self):
        self._link()
        session = AttendanceSession.objects.create(bus=self.bus, date=self.today, slot="EVENING")
        AttendanceRecord.objects.create(
            session=session, person_type="STUDENT", student=self.alice, status="PRESENT",
            source="QR_FACE",
        )
        self.client.force_authenticate(self.student_user)
        res = self.client.get(self.url)
        self.assertEqual(res.data["evening"]["today"]["status"], "PRESENT")
        self.assertEqual(res.data["evening"]["today"]["source"], "QR_FACE")
        self.assertFalse(res.data["morning"]["today"]["marked"])


class AttendanceLockAndCorrectionTests(APITestCase):
    """Attendance submit is staff/admin only (drivers and students mark via QR/face).
    Even so, a submit can never un-mark a Present record or flip Absent -> Present.
    Only the admin/staff correct endpoint can do that, and only once."""

    def setUp(self):
        self.bus = make_bus("B21")
        self.driver_user = make_user("driver21", "DRIVER")
        self.bus.driver = self.driver_user
        self.bus.save(update_fields=["driver"])
        self.admin = make_user("admin21", "ADMIN")
        self.alice = Student.objects.create(name="Alice", roll_number="R921", bus=self.bus)
        self.today = date.today()
        self.submit_url = f"/api/attendance/submit/?bus={self.bus.id}"

    def _submit(self, status_value, user=None):
        self.client.force_authenticate(user or self.admin)
        return self.client.post(self.submit_url, {
            "date": str(self.today), "slot": "MORNING", "is_holiday": False,
            "records": [{"person_type": "STUDENT", "id": self.alice.id, "status": status_value}],
        }, format="json")

    def _record(self):
        return AttendanceRecord.objects.get(student=self.alice, session__date=self.today, session__slot="MORNING")

    def test_driver_cannot_submit_attendance(self):
        res = self._submit("PRESENT", user=self.driver_user)
        self.assertEqual(res.status_code, 403)
        self.assertFalse(AttendanceSession.objects.exists())
        self.assertFalse(AttendanceRecord.objects.exists())

    def test_submit_cannot_unmark_present(self):
        self._submit("PRESENT")
        self.assertEqual(self._record().status, "PRESENT")
        self._submit("ABSENT")
        self.assertEqual(self._record().status, "PRESENT")

    def test_submit_cannot_self_correct_absent_to_present(self):
        self._submit("ABSENT")
        self.assertEqual(self._record().status, "ABSENT")
        self._submit("PRESENT")
        self.assertEqual(self._record().status, "ABSENT")

    def test_fresh_present_submission_still_works(self):
        res = self._submit("PRESENT")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(self._record().status, "PRESENT")

    def test_admin_correction_flips_absent_to_present_once(self):
        self._submit("ABSENT")
        record = self._record()
        self.client.force_authenticate(self.admin)
        url = f"/api/attendance/records/{record.id}/correct/"
        res = self.client.patch(url, {"remark": "Sick note verified"}, format="json")
        self.assertEqual(res.status_code, 200)
        record.refresh_from_db()
        self.assertEqual(record.status, "PRESENT")
        self.assertTrue(record.is_correction)
        self.assertEqual(record.corrected_by_id, self.admin.id)

        # Second correction attempt is rejected: already Present and locked.
        res2 = self.client.patch(url, {}, format="json")
        self.assertEqual(res2.status_code, 400)

    def test_driver_cannot_call_correct_endpoint(self):
        self._submit("ABSENT")
        record = self._record()
        self.client.force_authenticate(self.driver_user)
        res = self.client.patch(f"/api/attendance/records/{record.id}/correct/", {}, format="json")
        self.assertEqual(res.status_code, 403)


class AttendanceAnalyticsTests(APITestCase):
    """Phase 2: cohort-wide analytics aggregation for a small seeded dataset."""

    def setUp(self):
        self.bus = make_bus("B22")
        self.admin = make_user("admin22", "ADMIN")
        self.driver = make_user("driver22", "DRIVER")
        self.alice = Student.objects.create(name="Alice", roll_number="R922A", bus=self.bus, department="CSE")
        self.bob = Student.objects.create(name="Bob", roll_number="R922B", bus=self.bus, department="CSE")
        self.today = date.today()

        # Day 1: both present.
        s1 = AttendanceSession.objects.create(bus=self.bus, date=self.today - timedelta(days=1))
        AttendanceRecord.objects.create(session=s1, person_type="STUDENT", student=self.alice, status="PRESENT")
        AttendanceRecord.objects.create(session=s1, person_type="STUDENT", student=self.bob, status="PRESENT")

        # Day 2: Alice absent, Bob present.
        s2 = AttendanceSession.objects.create(bus=self.bus, date=self.today)
        AttendanceRecord.objects.create(session=s2, person_type="STUDENT", student=self.alice, status="ABSENT")
        AttendanceRecord.objects.create(session=s2, person_type="STUDENT", student=self.bob, status="PRESENT")

        self.url = "/api/attendance/analytics/overview/"

    def test_overview_percentages(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get(self.url, {"period": "monthly", "year": self.today.year, "month": self.today.month})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["total_count"], 4)
        self.assertEqual(res.data["present_count"], 3)
        self.assertEqual(res.data["absent_count"], 1)
        self.assertEqual(res.data["overall_pct"], 75.0)

    def test_top_absentees_lists_alice(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get(self.url, {"period": "monthly", "year": self.today.year, "month": self.today.month})
        names = [a["name"] for a in res.data["top_absentees"]]
        self.assertIn("Alice", names)

    def test_driver_cannot_access_overview(self):
        self.client.force_authenticate(self.driver)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 403)

    def test_student_analytics_endpoint(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get(f"/api/attendance/analytics/student/{self.alice.id}/", {"year": self.today.year})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["present_count"], 1)
        self.assertEqual(res.data["absent_count"], 1)
        self.assertEqual(res.data["attendance_pct"], 50.0)
        self.assertEqual(res.data["longest_absence_streak"], 1)


class AttendanceWindowConfigTests(APITestCase):
    """Admins and transport staff can customize the MORNING/EVENING attendance
    windows; nobody else can, though everyone can read the current times."""

    url = "/api/attendance/window-config/"

    def setUp(self):
        self.student = make_user("winstu", "STUDENT")
        self.admin = make_user("winadmin", "ADMIN")
        self.staff = make_user("winstaff", "STAFF")

    def test_defaults_match_previous_hardcoded_times(self):
        self.client.force_authenticate(self.student)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["morning_start"], "05:00:00")
        self.assertEqual(res.data["morning_end"], "09:30:00")
        self.assertEqual(res.data["evening_start"], "16:30:00")
        self.assertEqual(res.data["evening_end"], "19:30:00")

    def test_student_cannot_edit(self):
        self.client.force_authenticate(self.student)
        res = self.client.patch(self.url, {"morning_start": "06:00:00"}, format="json")
        self.assertEqual(res.status_code, 403)

    def test_admin_can_edit(self):
        self.client.force_authenticate(self.admin)
        res = self.client.patch(self.url, {"morning_start": "06:00:00"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["morning_start"], "06:00:00")
        self.assertEqual(res.data["updated_by_username"], "winadmin")

    def test_staff_can_edit(self):
        self.client.force_authenticate(self.staff)
        res = self.client.patch(self.url, {"evening_end": "20:00:00"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["evening_end"], "20:00:00")

    def test_start_after_end_is_rejected(self):
        self.client.force_authenticate(self.admin)
        res = self.client.patch(
            self.url, {"morning_start": "10:00:00", "morning_end": "09:00:00"}, format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_overlapping_slots_rejected(self):
        self.client.force_authenticate(self.admin)
        res = self.client.patch(
            self.url, {"morning_end": "18:00:00"}, format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_get_solo_creates_singleton_with_defaults(self):
        cfg = AttendanceWindowConfig.get_solo()
        self.assertEqual(cfg.pk, 1)
        self.assertEqual(AttendanceWindowConfig.objects.count(), 1)
