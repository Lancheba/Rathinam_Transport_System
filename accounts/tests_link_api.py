from django.contrib.auth.models import User
from django.core.cache import cache
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from accounts.linking import approve, request_bus_claim, request_teacher_link
from accounts.models import LinkRequest
from attendance.models import Teacher
from buses.models import Bus

MY_LINK = "/api/auth/me/teacher-link/"
LIST_URL = "/api/auth/link-requests/"


def decide_url(pk, action):
    return "/api/auth/link-requests/%s/%s/" % (pk, action)


def make_user(username, role="STUDENT", identity=None):
    user = User.objects.create_user(username, password="pass12345")
    user.profile.role = role
    user.profile.identity = identity
    user.profile.save()
    return user


def make_bus(number, driver=None):
    return Bus.objects.create(
        bus_number=number, rfid_uid="RFID-" + number, route="R",
        departure_time="08:00", length_m=10, width_m=2.5, driver=driver,
    )


def client_for(user=None):
    c = APIClient()
    if user is not None:
        c.force_authenticate(user)
    return c


class TeacherSelfLinkApiTests(TestCase):
    def setUp(self):
        cache.clear()  # the POST is throttled per user
        self.teacher = Teacher.objects.create(name="Mr T", staff_id="T100", department="Maths")
        self.user = make_user("teach1", identity="TEACHER")
        self.client = client_for(self.user)

    def test_anonymous_is_refused(self):
        self.assertEqual(client_for().get(MY_LINK).status_code, 401)
        self.assertEqual(client_for().post(MY_LINK, {"staff_id": "T100"}, format="json").status_code, 401)

    def test_get_when_nothing_requested(self):
        r = self.client.get(MY_LINK)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data, {"linked": False, "teacher": None, "request": None})

    def test_post_creates_a_pending_request_and_links_nothing(self):
        r = self.client.post(MY_LINK, {"staff_id": "T100"}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["request"]["status"], "PENDING")
        self.assertEqual(r.data["request"]["teacher"]["staff_id"], "T100")
        self.assertFalse(r.data["linked"])
        self.teacher.refresh_from_db()
        self.assertIsNone(self.teacher.linked_user)

    def test_get_shows_the_pending_request(self):
        self.client.post(MY_LINK, {"staff_id": "T100"}, format="json")
        r = self.client.get(MY_LINK)
        self.assertFalse(r.data["linked"])
        self.assertEqual(r.data["request"]["status"], "PENDING")

    def test_get_shows_the_link_after_approval(self):
        lr = request_teacher_link(self.user, "T100")
        approve(lr, make_user("staff1", role="STAFF"))
        r = self.client.get(MY_LINK)
        self.assertTrue(r.data["linked"])
        self.assertEqual(r.data["teacher"]["name"], "Mr T")
        self.assertEqual(r.data["teacher"]["staff_id"], "T100")

    def test_unknown_staff_id_gives_400_with_a_message(self):
        r = self.client.post(MY_LINK, {"staff_id": "NOPE"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("No teacher found", r.data["detail"])

    def test_blank_staff_id_gives_400(self):
        r = self.client.post(MY_LINK, {"staff_id": "   "}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_junk_bodies_give_400_never_500(self):
        for body in ({}, {"staff_id": None}, {"staff_id": ["T100"]}, {"staff_id": {"a": 1}},
                     {"staff_id": "x" * 500}, [1, 2, 3], "T100"):
            r = self.client.post(MY_LINK, body, format="json")
            self.assertEqual(r.status_code, 400, "body %r -> %s" % (body, r.status_code))

    def test_numeric_staff_id_is_treated_as_text(self):
        Teacher.objects.create(name="Num", staff_id="4521")
        r = self.client.post(MY_LINK, {"staff_id": 4521}, format="json")
        self.assertEqual(r.status_code, 201, r.data)

    def test_already_linked_account_is_refused(self):
        lr = request_teacher_link(self.user, "T100")
        approve(lr, make_user("staff1", role="STAFF"))
        Teacher.objects.create(name="Ms U", staff_id="T200")
        r = self.client.post(MY_LINK, {"staff_id": "T200"}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_teacher_linked_to_someone_else_is_refused(self):
        self.teacher.linked_user = make_user("teach2", identity="TEACHER")
        self.teacher.save()
        r = self.client.post(MY_LINK, {"staff_id": "T100"}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_delete_cancels_my_pending_request(self):
        self.client.post(MY_LINK, {"staff_id": "T100"}, format="json")
        r = self.client.delete(MY_LINK)
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data["cancelled"])
        self.assertEqual(LinkRequest.objects.get().status, LinkRequest.CANCELLED)
        self.assertIsNone(self.client.get(MY_LINK).data["request"])

    def test_delete_with_nothing_pending_is_harmless(self):
        r = self.client.delete(MY_LINK)
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.data["cancelled"])

    def test_delete_never_unlinks_an_approved_teacher(self):
        lr = request_teacher_link(self.user, "T100")
        approve(lr, make_user("staff1", role="STAFF"))
        self.client.delete(MY_LINK)
        self.teacher.refresh_from_db()
        self.assertEqual(self.teacher.linked_user_id, self.user.pk)

    def test_requests_are_rate_limited_per_user(self):
        statuses = [self.client.post(MY_LINK, {"staff_id": "NOPE"}, format="json").status_code
                    for _ in range(11)]
        self.assertEqual(statuses[:10], [400] * 10)
        self.assertEqual(statuses[10], 429)

    def test_rate_limit_is_not_shared_between_users(self):
        for _ in range(10):
            self.client.post(MY_LINK, {"staff_id": "NOPE"}, format="json")
        other = client_for(make_user("teach9", identity="TEACHER"))
        self.assertEqual(other.post(MY_LINK, {"staff_id": "NOPE"}, format="json").status_code, 400)


class StaffDecisionApiTests(TestCase):
    def setUp(self):
        cache.clear()
        self.teacher = Teacher.objects.create(name="Mr T", staff_id="T100")
        self.user = make_user("teach1", identity="TEACHER")
        self.staff = make_user("staff1", role="STAFF")
        self.staff_client = client_for(self.staff)
        self.lr = request_teacher_link(self.user, "T100")

    # --- who may use it
    def test_anonymous_is_401_and_student_is_403_on_every_route(self):
        for c, code in ((client_for(), 401), (client_for(make_user("stud1")), 403),
                        (client_for(make_user("drv1", role="DRIVER")), 403)):
            self.assertEqual(c.get(LIST_URL).status_code, code)
            self.assertEqual(c.post(decide_url(self.lr.pk, "approve"), {}, format="json").status_code, code)
            self.assertEqual(c.post(decide_url(self.lr.pk, "reject"), {}, format="json").status_code, code)

    def test_forbidden_approve_changes_nothing(self):
        client_for(make_user("stud1")).post(decide_url(self.lr.pk, "approve"), {}, format="json")
        self.teacher.refresh_from_db()
        self.lr.refresh_from_db()
        self.assertIsNone(self.teacher.linked_user)
        self.assertEqual(self.lr.status, LinkRequest.PENDING)

    def test_superuser_without_a_role_can_decide(self):
        boss = User.objects.create_superuser("boss", "b@x.com", "pass12345")
        r = client_for(boss).post(decide_url(self.lr.pk, "approve"), {}, format="json")
        self.assertEqual(r.status_code, 200, r.data)

    # --- listing
    def test_list_defaults_to_pending_only(self):
        other = make_user("teach2", identity="TEACHER")
        Teacher.objects.create(name="Ms U", staff_id="T200")
        done = request_teacher_link(other, "T200")
        approve(done, self.staff)
        r = self.staff_client.get(LIST_URL)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["count"], 1)
        row = r.data["results"][0]
        self.assertEqual(row["id"], self.lr.pk)
        self.assertEqual(row["status"], "PENDING")
        self.assertEqual(row["kind"], "TEACHER")
        self.assertEqual(row["user"]["username"], "teach1")
        self.assertEqual(row["teacher"]["staff_id"], "T100")
        self.assertIsNone(row["bus"])

    def test_list_can_filter_by_status_and_kind(self):
        approve(self.lr, self.staff)
        self.assertEqual(self.staff_client.get(LIST_URL + "?status=APPROVED").data["count"], 1)
        self.assertEqual(self.staff_client.get(LIST_URL + "?status=PENDING").data["count"], 0)
        self.assertEqual(self.staff_client.get(LIST_URL + "?status=APPROVED&kind=DRIVER_BUS").data["count"], 0)

    def test_list_all_statuses(self):
        approve(self.lr, self.staff)
        r = self.staff_client.get(LIST_URL + "?status=ALL")
        self.assertEqual(r.data["count"], 1)

    def test_bad_filters_give_400(self):
        self.assertEqual(self.staff_client.get(LIST_URL + "?status=BOGUS").status_code, 400)
        self.assertEqual(self.staff_client.get(LIST_URL + "?kind=BOGUS").status_code, 400)

    def test_list_shows_driver_bus_requests_too(self):
        make_bus("B1")
        request_bus_claim(make_user("drv1", role="DRIVER"), "B1")
        rows = self.staff_client.get(LIST_URL + "?kind=DRIVER_BUS").data["results"]
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["bus"]["bus_number"], "B1")
        self.assertIsNone(rows[0]["teacher"])

    def test_list_query_count_does_not_grow_with_rows(self):
        with CaptureQueriesContext(connection) as one:
            self.staff_client.get(LIST_URL)
        for i in range(5):
            u = make_user("more%d" % i, identity="TEACHER")
            Teacher.objects.create(name="N%d" % i, staff_id="S%d" % i)
            request_teacher_link(u, "S%d" % i)
        with CaptureQueriesContext(connection) as six:
            self.staff_client.get(LIST_URL)
        self.assertEqual(len(one), len(six))

    # --- approve / reject
    def test_approve_links_the_teacher(self):
        r = self.staff_client.post(decide_url(self.lr.pk, "approve"), {"note": "ID checked"}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["status"], "APPROVED")
        self.assertEqual(r.data["decided_by"], "staff1")
        self.assertEqual(r.data["decision_note"], "ID checked")
        self.teacher.refresh_from_db()
        self.assertEqual(self.teacher.linked_user_id, self.user.pk)

    def test_approve_works_without_a_body(self):
        r = self.staff_client.post(decide_url(self.lr.pk, "approve"))
        self.assertEqual(r.status_code, 200, r.data)

    def test_approve_a_driver_bus_request(self):
        bus = make_bus("B1")
        drv = make_user("drv1", role="DRIVER")
        lr = request_bus_claim(drv, "B1")
        r = self.staff_client.post(decide_url(lr.pk, "approve"), {}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        bus.refresh_from_db()
        self.assertEqual(bus.driver_id, drv.pk)

    def test_reject_links_nothing(self):
        r = self.staff_client.post(decide_url(self.lr.pk, "reject"), {"note": "not you"}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["status"], "REJECTED")
        self.teacher.refresh_from_db()
        self.assertIsNone(self.teacher.linked_user)

    def test_note_over_200_characters_is_a_400_and_changes_nothing(self):
        r = self.staff_client.post(decide_url(self.lr.pk, "approve"), {"note": "x" * 201}, format="json")
        self.assertEqual(r.status_code, 400)
        self.lr.refresh_from_db()
        self.assertEqual(self.lr.status, LinkRequest.PENDING)

    def test_junk_note_types_give_400(self):
        for body in ({"note": ["a"]}, {"note": {"a": 1}}, {"note": None}):
            r = self.staff_client.post(decide_url(self.lr.pk, "reject"), body, format="json")
            self.assertEqual(r.status_code, 400, body)

    def test_unknown_request_id_is_404(self):
        self.assertEqual(self.staff_client.post(decide_url(99999, "approve"), {}, format="json").status_code, 404)
        self.assertEqual(self.staff_client.post(decide_url(99999, "reject"), {}, format="json").status_code, 404)

    def test_deciding_twice_gives_400_with_a_message(self):
        self.staff_client.post(decide_url(self.lr.pk, "approve"), {}, format="json")
        r = self.staff_client.post(decide_url(self.lr.pk, "reject"), {}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("already", r.data["detail"])

    def test_conflict_gives_400_and_leaves_request_pending(self):
        Teacher.objects.filter(pk=self.teacher.pk).update(linked_user=make_user("teach4", identity="TEACHER"))
        r = self.staff_client.post(decide_url(self.lr.pk, "approve"), {}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("already linked", r.data["detail"])
        self.lr.refresh_from_db()
        self.assertEqual(self.lr.status, LinkRequest.PENDING)

    def test_only_post_is_allowed_on_decision_routes(self):
        self.assertEqual(self.staff_client.get(decide_url(self.lr.pk, "approve")).status_code, 405)
        self.assertEqual(self.staff_client.delete(decide_url(self.lr.pk, "approve")).status_code, 405)

    def test_absurdly_large_request_id_is_404_not_500(self):
        big = 10 ** 30
        self.assertEqual(self.staff_client.post(decide_url(big, "approve"), {}, format="json").status_code, 404)
        self.assertEqual(self.staff_client.post(decide_url(big, "reject"), {}, format="json").status_code, 404)
