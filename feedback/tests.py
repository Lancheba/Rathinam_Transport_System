from django.contrib.auth.models import User
from django.core.cache import cache
from rest_framework.test import APITestCase

from buses.models import Bus

from .models import Feedback

URL = "/api/feedback/"
PAYLOAD = {
    "kind": "COMPLAINT",
    "category": "BUS",
    "subject": "Broken seat on B04",
    "message": "The seat in row 3 has been broken for a week.",
}


def make_user(username, role=None, **extra):
    user = User.objects.create_user(username, password="pass1234", **extra)
    if role:
        user.profile.role = role
        user.profile.save()
    return user


class FeedbackTestBase(APITestCase):
    def setUp(self):
        cache.clear()  # the submit throttle keeps its counters in the cache
        self.student = make_user("stu", "STUDENT")
        self.staff = make_user("stf", "STAFF")
        self.admin = make_user("adm", "ADMIN")
        self.superuser = User.objects.create_superuser("root", password="pass1234")


class SubmitTests(FeedbackTestBase):
    def test_student_can_submit(self):
        self.client.force_authenticate(self.student)
        res = self.client.post(URL, PAYLOAD, format="json")
        self.assertEqual(res.status_code, 201)
        fb = Feedback.objects.get()
        self.assertEqual(fb.author, self.student)
        self.assertEqual(fb.author_role, "Student")
        self.assertEqual(fb.status, "NEW")

    def test_staff_can_submit(self):
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.post(URL, PAYLOAD, format="json").status_code, 201)
        self.assertEqual(Feedback.objects.get().author_role, "Transport Staff")

    def test_must_be_signed_in(self):
        self.assertEqual(self.client.post(URL, PAYLOAD, format="json").status_code, 401)
        self.assertEqual(Feedback.objects.count(), 0)

    def test_response_does_not_leak_admin_fields(self):
        self.client.force_authenticate(self.student)
        data = self.client.post(URL, PAYLOAD, format="json").json()
        self.assertNotIn("admin_note", data)
        self.assertNotIn("status", data)
        self.assertNotIn("author_name", data)

    def test_anonymous_stores_no_author(self):
        self.client.force_authenticate(self.student)
        self.client.post(URL, {**PAYLOAD, "is_anonymous": True}, format="json")
        fb = Feedback.objects.get()
        self.assertIsNone(fb.author)
        self.assertEqual(fb.author_role, "Student")

    def test_can_attach_a_bus(self):
        bus = Bus.objects.create(
            bus_number="B04", rfid_uid="U4", route="R", departure_time="08:00", length_m=10, width_m=2.5
        )
        self.client.force_authenticate(self.student)
        res = self.client.post(URL, {**PAYLOAD, "bus": bus.pk}, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(Feedback.objects.get().bus, bus)

    def test_validation(self):
        self.client.force_authenticate(self.student)
        for bad in (
            {**PAYLOAD, "subject": "   "},
            {**PAYLOAD, "message": "short"},
            {**PAYLOAD, "kind": "NOPE"},
            {**PAYLOAD, "bus": 9999},
        ):
            self.assertEqual(self.client.post(URL, bad, format="json").status_code, 400, bad)
        self.assertEqual(Feedback.objects.count(), 0)

    def test_submissions_are_rate_limited(self):
        self.client.force_authenticate(self.student)
        codes = [self.client.post(URL, PAYLOAD, format="json").status_code for _ in range(21)]
        self.assertEqual(codes[:20], [201] * 20)
        self.assertEqual(codes[20], 429)


class AdminOnlyTests(FeedbackTestBase):
    def setUp(self):
        super().setUp()
        self.fb = Feedback.objects.create(
            kind="COMPLAINT", category="BUS", subject="s", message="m" * 12,
            author=self.student, author_role="Student",
        )
        self.detail = f"{URL}{self.fb.pk}/"

    def test_students_and_staff_cannot_read(self):
        for user in (self.student, self.staff):
            self.client.force_authenticate(user)
            self.assertEqual(self.client.get(URL).status_code, 403, user.username)
            self.assertEqual(self.client.get(self.detail).status_code, 403, user.username)

    def test_sender_cannot_read_their_own(self):
        self.client.force_authenticate(self.student)
        self.assertEqual(self.client.get(self.detail).status_code, 403)

    def test_anonymous_visitor_is_rejected(self):
        self.assertIn(self.client.get(URL).status_code, (401, 403))

    def test_students_and_staff_cannot_change_or_delete(self):
        for user in (self.student, self.staff):
            self.client.force_authenticate(user)
            self.assertEqual(self.client.patch(self.detail, {"status": "RESOLVED"}, format="json").status_code, 403)
            self.assertEqual(self.client.delete(self.detail).status_code, 403)
        self.assertTrue(Feedback.objects.filter(pk=self.fb.pk).exists())

    def test_admin_and_superuser_can_read(self):
        for user in (self.admin, self.superuser):
            self.client.force_authenticate(user)
            res = self.client.get(URL)
            self.assertEqual(res.status_code, 200)
            self.assertEqual(len(res.json()), 1)
            self.assertEqual(res.json()[0]["author_name"], "stu")

    def test_admin_sees_anonymous_as_anonymous(self):
        self.fb.is_anonymous, self.fb.author = True, None
        self.fb.save()
        self.client.force_authenticate(self.admin)
        row = self.client.get(URL).json()[0]
        self.assertEqual(row["author_name"], "Anonymous")
        self.assertEqual(row["author_role"], "Student")

    def test_admin_can_only_change_status_and_note(self):
        self.client.force_authenticate(self.admin)
        res = self.client.patch(
            self.detail,
            {"status": "RESOLVED", "admin_note": "Seat replaced", "subject": "hacked"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.fb.refresh_from_db()
        self.assertEqual((self.fb.status, self.fb.admin_note), ("RESOLVED", "Seat replaced"))
        self.assertEqual(self.fb.subject, "s")

    def test_put_is_not_allowed(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.put(self.detail, {}, format="json").status_code, 405)

    def test_admin_can_filter_and_delete(self):
        Feedback.objects.create(kind="SUGGESTION", category="APP", subject="x", message="y" * 12, status="RESOLVED")
        self.client.force_authenticate(self.admin)
        self.assertEqual(len(self.client.get(URL, {"status": "RESOLVED"}).json()), 1)
        self.assertEqual(len(self.client.get(URL, {"kind": "COMPLAINT"}).json()), 1)
        self.assertEqual(self.client.delete(self.detail).status_code, 204)
        self.assertEqual(Feedback.objects.count(), 1)


class MeEndpointTests(FeedbackTestBase):
    def test_is_admin_flag(self):
        expected = {"stu": False, "stf": False, "adm": True, "root": True}
        for name, flag in expected.items():
            self.client.force_authenticate(User.objects.get(username=name))
            self.assertEqual(self.client.get("/api/auth/me/").json()["is_admin"], flag, name)
