from datetime import date, timedelta

from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from buses.models import Bus
from students.models import Student

from .models import AttendanceRecord, AttendanceSession, Teacher

BUS_FIELDS = {
    "rfid_uid": "RFID-COV2",
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


def make_bus(bus_number, **overrides):
    fields = {
        "bus_number": bus_number,
        "route": f"Route for {bus_number}",
        "rfid_uid": f"{BUS_FIELDS['rfid_uid']}-{bus_number}",
        "departure_time": BUS_FIELDS["departure_time"],
        "length_m": BUS_FIELDS["length_m"],
        "width_m": BUS_FIELDS["width_m"],
    }
    fields.update(overrides)
    return Bus.objects.create(**fields)


class AttendanceSubmitCoverageTests(APITestCase):
    url = "/api/attendance/submit/"

    def setUp(self):
        self.admin = make_user("cov2_admin1", "ADMIN")
        self.driver = make_user("cov2_driver1", "DRIVER")
        self.bus = make_bus("COV2S1")
        self.student = Student.objects.create(name="Sub Kid", roll_number="SK1", bus=self.bus)
        self.today = date.today()

    def test_no_bus_for_non_staff_driver_returns_400(self):
        self.client.force_authenticate(self.driver)
        res = self.client.post(self.url, {"date": str(self.today), "records": []}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_driver_forbidden_even_with_bus(self):
        self.bus.driver = self.driver
        self.bus.save(update_fields=["driver"])
        self.client.force_authenticate(self.driver)
        res = self.client.post(
            self.url,
            {"bus": self.bus.id, "date": str(self.today), "records": [
                {"person_type": "STUDENT", "id": self.student.id, "status": "PRESENT"}
            ]},
            format="json",
        )
        self.assertEqual(res.status_code, 403)

    def test_holiday_blocked_when_present_records_exist(self):
        session = AttendanceSession.objects.create(bus=self.bus, date=self.today, slot="MORNING")
        AttendanceRecord.objects.create(
            session=session, person_type="STUDENT", student=self.student, status="PRESENT",
        )
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            self.url,
            {"bus": self.bus.id, "date": str(self.today), "is_holiday": True, "holiday_reason": "Festival"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("already marked PRESENT", res.data["detail"])

    def test_valid_submit_creates_records(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            self.url,
            {"bus": self.bus.id, "date": str(self.today), "records": [
                {"person_type": "STUDENT", "id": self.student.id, "status": "PRESENT"}
            ]},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(
            AttendanceRecord.objects.filter(student=self.student, status="PRESENT").count(), 1
        )

    def test_second_submit_cannot_flip_present_to_absent(self):
        self.client.force_authenticate(self.admin)
        self.client.post(
            self.url,
            {"bus": self.bus.id, "date": str(self.today), "records": [
                {"person_type": "STUDENT", "id": self.student.id, "status": "PRESENT"}
            ]},
            format="json",
        )
        res = self.client.post(
            self.url,
            {"bus": self.bus.id, "date": str(self.today), "records": [
                {"person_type": "STUDENT", "id": self.student.id, "status": "ABSENT"}
            ]},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        record = AttendanceRecord.objects.get(student=self.student)
        self.assertEqual(record.status, "PRESENT")


class AttendanceCorrectCoverageTests(APITestCase):
    def setUp(self):
        self.admin = make_user("cov2_admin2", "ADMIN")
        self.bus = make_bus("COV2C1")
        self.student = Student.objects.create(name="Corr Kid", roll_number="CK1", bus=self.bus)
        self.session = AttendanceSession.objects.create(bus=self.bus, date=date.today(), slot="MORNING")

    def _url(self, record_id):
        return f"/api/attendance/records/{record_id}/correct/"

    def test_unknown_record_404(self):
        self.client.force_authenticate(self.admin)
        res = self.client.patch(self._url(999999), {"remark": "Valid remark text"})
        self.assertEqual(res.status_code, 404)

    def test_already_present_is_locked(self):
        record = AttendanceRecord.objects.create(
            session=self.session, person_type="STUDENT", student=self.student, status="PRESENT",
        )
        self.client.force_authenticate(self.admin)
        res = self.client.patch(self._url(record.id), {"remark": "Trying to change it"})
        self.assertEqual(res.status_code, 400)

    def test_short_remark_rejected(self):
        record = AttendanceRecord.objects.create(
            session=self.session, person_type="STUDENT", student=self.student, status="ABSENT",
        )
        self.client.force_authenticate(self.admin)
        res = self.client.patch(self._url(record.id), {"remark": "short"})
        self.assertEqual(res.status_code, 400)

    def test_valid_correction_flips_to_present(self):
        record = AttendanceRecord.objects.create(
            session=self.session, person_type="STUDENT", student=self.student, status="ABSENT",
        )
        self.client.force_authenticate(self.admin)
        res = self.client.patch(self._url(record.id), {"remark": "Confirmed present by CCTV review"})
        self.assertEqual(res.status_code, 200)
        record.refresh_from_db()
        self.assertEqual(record.status, "PRESENT")


class AttendanceHistoryExportCoverageTests(APITestCase):
    def setUp(self):
        self.admin = make_user("cov2_admin3", "ADMIN")
        self.driver = make_user("cov2_driver3", "DRIVER")
        self.bus = make_bus("COV2H1")
        self.bus.driver = self.driver
        self.bus.save(update_fields=["driver"])
        self.student = Student.objects.create(name="Hist Kid", roll_number="HK1", bus=self.bus)
        self.today = date.today()
        self.session = AttendanceSession.objects.create(bus=self.bus, date=self.today, slot="MORNING")
        AttendanceRecord.objects.create(
            session=self.session, person_type="STUDENT", student=self.student, status="PRESENT",
        )
        self.holiday_session = AttendanceSession.objects.create(
            bus=self.bus, date=self.today - timedelta(days=1), slot="MORNING",
            is_holiday=True, holiday_reason="Public holiday",
        )

    def test_history_date_range_filter(self):
        self.client.force_authenticate(self.driver)
        res = self.client.get(
            "/api/attendance/sessions/",
            {"from": str(self.today), "to": str(self.today)},
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)

    def test_export_forbidden_for_unrelated_user(self):
        other = make_user("cov2_outsider1", "STUDENT")
        self.client.force_authenticate(other)
        res = self.client.get("/api/attendance/export/", {"bus": self.bus.id})
        self.assertEqual(res.status_code, 403)

    def test_export_csv_includes_holiday_row(self):
        self.client.force_authenticate(self.driver)
        res = self.client.get("/api/attendance/export/", {"filetype": "csv"})
        self.assertEqual(res.status_code, 200)
        content = res.content.decode()
        self.assertIn("HOLIDAY", content)
        self.assertIn("Hist Kid", content)

    def test_export_xlsx(self):
        self.client.force_authenticate(self.driver)
        res = self.client.get("/api/attendance/export/", {"filetype": "xlsx"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(
            res["Content-Type"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )

    def test_export_pdf(self):
        self.client.force_authenticate(self.driver)
        res = self.client.get("/api/attendance/export/", {"filetype": "pdf"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res["Content-Type"], "application/pdf")


class MyAttendanceCoverageTests(APITestCase):
    def test_unlinked_user_gets_linked_false(self):
        user = make_user("cov2_stud_unlinked", "STUDENT")
        self.client.force_authenticate(user)
        res = self.client.get("/api/attendance/my/")
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data["linked"])
        self.assertIsNone(res.data["student"])


class AttendanceAnalyticsCoverageTests(APITestCase):
    def setUp(self):
        self.admin = make_user("cov2_admin4", "ADMIN")
        self.bus = make_bus("COV2AN1")
        self.student = Student.objects.create(
            name="Ana Kid", roll_number="AK1", bus=self.bus, department="CSE",
        )
        self.today = date.today()
        self.session = AttendanceSession.objects.create(bus=self.bus, date=self.today, slot="MORNING")
        AttendanceRecord.objects.create(
            session=self.session, person_type="STUDENT", student=self.student, status="ABSENT",
        )

    def test_overview_filtered_by_bus_and_department_yearly(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get(
            "/api/attendance/analytics/overview/",
            {"period": "yearly", "bus": self.bus.id, "department": "CSE"},
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["total_count"], 1)
        self.assertEqual(len(res.data["top_absentees"]), 1)

    def test_incharge_analytics_requires_assigned_bus(self):
        incharge = make_user("cov2_incharge1", "INCHARGE")
        self.client.force_authenticate(incharge)
        res = self.client.get("/api/attendance/analytics/incharge/")
        self.assertEqual(res.status_code, 400)

    def test_incharge_analytics_with_bus_yearly(self):
        incharge = make_user("cov2_incharge2", "INCHARGE")
        self.bus.incharge = incharge
        self.bus.save(update_fields=["incharge"])
        self.client.force_authenticate(incharge)
        res = self.client.get("/api/attendance/analytics/incharge/", {"period": "yearly"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["bus_number"], self.bus.bus_number)
        self.assertEqual(res.data["total_count"], 1)

    def test_analytics_student_not_found(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get("/api/attendance/analytics/student/999999/")
        self.assertEqual(res.status_code, 404)

    def test_analytics_student_forbidden_for_unrelated_student(self):
        other_user = make_user("cov2_other_student1", "STUDENT")
        self.client.force_authenticate(other_user)
        res = self.client.get(f"/api/attendance/analytics/student/{self.student.id}/")
        self.assertEqual(res.status_code, 403)

    def test_analytics_student_allowed_for_admin_with_month_filter(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get(
            f"/api/attendance/analytics/student/{self.student.id}/",
            {"month": str(self.today.month)},
        )
        self.assertEqual(res.status_code, 200)
