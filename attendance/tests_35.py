from datetime import date, timedelta

from rest_framework.test import APITestCase

from buses.models import Bus
from students.models import Student

from .models import AttendanceRecord, AttendanceSession
from .tests import make_bus, make_user

URL = "/api/attendance/report/"


class ReportScopeTests(APITestCase):
    def setUp(self):
        self.bus1 = make_bus("R1")
        self.bus2 = make_bus("R2")
        self.s1 = Student.objects.create(name="S1", roll_number="RR1", bus=self.bus1)
        self.s2 = Student.objects.create(name="S2", roll_number="RR2", bus=self.bus2)
        self.staff = make_user("rep_staff", "STAFF")
        self.incharge = make_user("rep_incharge", "INCHARGE")
        self.bus1.incharge = self.incharge
        self.bus1.save(update_fields=["incharge"])
        self.incharge_no_bus = make_user("rep_incharge2", "INCHARGE")
        self.driver = make_user("rep_driver", "DRIVER")
        self.bus2.driver = self.driver
        self.bus2.save(update_fields=["driver"])
        self.student_user = make_user("rep_student_user", "STUDENT")
        self.s1.linked_user = self.student_user
        self.s1.save(update_fields=["linked_user"])
        self.random_user = make_user("rep_random", "STUDENT")

    def test_staff_sees_everyone_by_default(self):
        self.client.force_authenticate(self.staff)
        res = self.client.get(URL, {"filetype": "json"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["count"], 2)

    def test_staff_can_filter_by_bus(self):
        self.client.force_authenticate(self.staff)
        res = self.client.get(URL, {"filetype": "json", "bus": self.bus1.pk})
        self.assertEqual(res.data["count"], 1)

    def test_staff_can_filter_by_student(self):
        self.client.force_authenticate(self.staff)
        res = self.client.get(URL, {"filetype": "json", "student": self.s2.pk})
        self.assertEqual(res.data["count"], 1)

    def test_incharge_sees_only_own_bus(self):
        self.client.force_authenticate(self.incharge)
        res = self.client.get(URL, {"filetype": "json"})
        self.assertEqual(res.data["count"], 1)

    def test_incharge_with_no_bus_sees_nothing(self):
        self.client.force_authenticate(self.incharge_no_bus)
        res = self.client.get(URL, {"filetype": "json"})
        self.assertEqual(res.data["count"], 0)

    def test_driver_sees_only_own_bus(self):
        self.client.force_authenticate(self.driver)
        res = self.client.get(URL, {"filetype": "json"})
        self.assertEqual(res.data["count"], 1)

    def test_student_sees_only_self(self):
        self.client.force_authenticate(self.student_user)
        res = self.client.get(URL, {"filetype": "json"})
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["rows"][0][0], "RR1")

    def test_unlinked_random_user_gets_403(self):
        self.client.force_authenticate(self.random_user)
        res = self.client.get(URL, {"filetype": "json"})
        self.assertEqual(res.status_code, 403)


class ReportRowsTests(APITestCase):
    def setUp(self):
        self.bus = make_bus("R3")
        self.staff = make_user("rep_staff2", "STAFF")
        self.client.force_authenticate(self.staff)

    def test_zero_sessions_shows_dash_percent(self):
        Student.objects.create(name="Nobody", roll_number="RR3", bus=self.bus)
        res = self.client.get(URL, {"filetype": "json"})
        row = res.data["rows"][0]
        self.assertEqual(row[8], 0)  # Sessions
        self.assertEqual(row[11], "-")  # Attendance %

    def test_present_absent_counts_and_percentage(self):
        student = Student.objects.create(
            name="Counted", roll_number="RR4", bus=self.bus,
            department="CSE", year=2, boarding_point="Gate 3", phone="9000000000",
        )
        today = date.today()
        s1 = AttendanceSession.objects.create(bus=self.bus, date=today, slot="MORNING")
        s2 = AttendanceSession.objects.create(bus=self.bus, date=today - timedelta(days=1), slot="MORNING")
        AttendanceRecord.objects.create(session=s1, person_type="STUDENT", student=student, status="PRESENT")
        AttendanceRecord.objects.create(session=s2, person_type="STUDENT", student=student, status="ABSENT")

        res = self.client.get(URL, {"filetype": "json"})
        row = res.data["rows"][0]
        self.assertEqual(row[2], "CSE")            # Department
        self.assertNotEqual(row[3], "-")            # Year display
        self.assertEqual(row[4], self.bus.bus_number)
        self.assertEqual(row[6], "Gate 3")          # Boarding point
        self.assertEqual(row[8], 2)                 # Sessions
        self.assertEqual(row[9], 1)                 # Present
        self.assertEqual(row[10], 1)                # Absent
        self.assertEqual(row[11], "50.0%")

    def test_date_range_filters_out_older_sessions(self):
        student = Student.objects.create(name="Ranged", roll_number="RR5", bus=self.bus)
        today = date.today()
        old_session = AttendanceSession.objects.create(bus=self.bus, date=today - timedelta(days=30), slot="MORNING")
        AttendanceRecord.objects.create(session=old_session, person_type="STUDENT", student=student, status="PRESENT")

        res = self.client.get(URL, {"filetype": "json", "from": str(today - timedelta(days=5))})
        row = res.data["rows"][0]
        self.assertEqual(row[8], 0)  # the old session is outside the range


class ReportFormatTests(APITestCase):
    def setUp(self):
        self.bus = make_bus("R6")
        Student.objects.create(name="Fmt", roll_number="RR6", bus=self.bus)
        self.staff = make_user("rep_staff3", "STAFF")
        self.client.force_authenticate(self.staff)

    def test_default_format_is_csv(self):
        res = self.client.get(URL)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res["Content-Type"], "text/csv; charset=utf-8")

    def test_pdf_format(self):
        res = self.client.get(URL, {"filetype": "pdf"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res["Content-Type"], "application/pdf")

    def test_xlsx_format(self):
        res = self.client.get(URL, {"filetype": "xlsx"})
        self.assertEqual(res.status_code, 200)
        self.assertIn("spreadsheetml", res["Content-Type"])
