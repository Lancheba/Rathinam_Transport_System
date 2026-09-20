from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from .models import Announcement

URL = "/api/announcements/"
PAYLOAD = {
    "title": "Route 4 delayed",
    "message": "Bus B04 leaves 15 minutes late today.",
    "priority": "IMPORTANT",
}


def make_user(username, role=None, **extra):
    user = User.objects.create_user(username, password="pass1234", **extra)
    if role:
        user.profile.role = role
        user.profile.save()
    return user


class ReadAnnouncementTests(APITestCase):
    def setUp(self):
        self.staff = make_user("stf", "STAFF")
        Announcement.objects.create(title="Old", message="first", author=self.staff)
        Announcement.objects.create(title="New", message="second", author=self.staff)

    def test_anonymous_visitor_can_read(self):
        res = self.client.get(URL)
        self.assertEqual(res.status_code, 200)
        self.assertEqual([a["title"] for a in res.data], ["New", "Old"])  # newest first

    def test_student_can_read(self):
        self.client.force_authenticate(make_user("stu", "STUDENT"))
        self.assertEqual(self.client.get(URL).status_code, 200)

    def test_list_shows_author_name_and_role(self):
        first = self.client.get(URL).data[0]
        self.assertEqual(first["author_name"], "stf")
        self.assertEqual(first["author_role"], "Transport Staff")

    def test_list_is_capped(self):
        Announcement.objects.bulk_create(
            Announcement(title=f"n{i}", message="x", author=self.staff) for i in range(60)
        )
        self.assertEqual(len(self.client.get(URL).data), 50)


class PostAnnouncementTests(APITestCase):
    def test_staff_can_post_and_is_recorded_as_author(self):
        staff = make_user("stf", "STAFF")
        self.client.force_authenticate(staff)
        res = self.client.post(URL, PAYLOAD, format="json")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(Announcement.objects.get().author, staff)
        self.assertEqual(res.data["author_role"], "Transport Staff")
        self.assertTrue(res.data["can_edit"])

    def test_admin_role_can_post(self):
        self.client.force_authenticate(make_user("adm", "ADMIN"))
        res = self.client.post(URL, PAYLOAD, format="json")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["author_role"], "Administrator")

    def test_superuser_with_default_role_can_post(self):
        root = User.objects.create_superuser("root", "r@x.com", "pass1234")
        self.client.force_authenticate(root)
        res = self.client.post(URL, PAYLOAD, format="json")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["author_role"], "Administrator")

    def test_student_cannot_post(self):
        self.client.force_authenticate(make_user("stu", "STUDENT"))
        self.assertEqual(self.client.post(URL, PAYLOAD, format="json").status_code, 403)
        self.assertFalse(Announcement.objects.exists())

    def test_anonymous_cannot_post(self):
        self.assertEqual(self.client.post(URL, PAYLOAD, format="json").status_code, 401)

    def test_author_cannot_be_spoofed(self):
        staff = make_user("stf", "STAFF")
        other = make_user("adm", "ADMIN")
        self.client.force_authenticate(staff)
        self.client.post(URL, {**PAYLOAD, "author": other.id}, format="json")
        self.assertEqual(Announcement.objects.get().author, staff)

    def test_priority_defaults_to_info(self):
        self.client.force_authenticate(make_user("stf", "STAFF"))
        res = self.client.post(URL, {"title": "Hi", "message": "there"}, format="json")
        self.assertEqual(res.data["priority"], "INFO")

    def test_invalid_input_is_rejected(self):
        self.client.force_authenticate(make_user("stf", "STAFF"))
        for bad in (
            {**PAYLOAD, "title": "   "},
            {**PAYLOAD, "message": ""},
            {**PAYLOAD, "priority": "PANIC"},
            {**PAYLOAD, "title": "x" * 121},
            {**PAYLOAD, "message": "x" * 1001},
        ):
            self.assertEqual(self.client.post(URL, bad, format="json").status_code, 400, bad)

    def test_text_is_trimmed(self):
        self.client.force_authenticate(make_user("stf", "STAFF"))
        res = self.client.post(URL, {**PAYLOAD, "title": "  Hello  "}, format="json")
        self.assertEqual(res.data["title"], "Hello")


class ChangeAnnouncementTests(APITestCase):
    def setUp(self):
        self.staff = make_user("stf", "STAFF")
        self.other_staff = make_user("stf2", "STAFF")
        self.admin = make_user("adm", "ADMIN")
        self.student = make_user("stu", "STUDENT")
        self.notice = Announcement.objects.create(title="T", message="M", author=self.staff)
        self.url = f"{URL}{self.notice.id}/"

    def test_author_can_delete_own(self):
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.delete(self.url).status_code, 204)

    def test_author_can_edit_own(self):
        self.client.force_authenticate(self.staff)
        res = self.client.patch(self.url, {"message": "Updated"}, format="json")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["message"], "Updated")

    def test_staff_cannot_touch_another_staffs_notice(self):
        self.client.force_authenticate(self.other_staff)
        self.assertEqual(self.client.delete(self.url).status_code, 403)
        self.assertEqual(self.client.patch(self.url, {"title": "x"}, format="json").status_code, 403)
        self.assertTrue(Announcement.objects.filter(pk=self.notice.pk).exists())

    def test_admin_can_delete_any(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.delete(self.url).status_code, 204)

    def test_student_cannot_delete(self):
        self.client.force_authenticate(self.student)
        self.assertEqual(self.client.delete(self.url).status_code, 403)

    def test_anonymous_cannot_delete(self):
        self.assertEqual(self.client.delete(self.url).status_code, 401)

    def test_can_edit_flag_matches_permissions(self):
        for user, expected in [(self.staff, True), (self.other_staff, False), (self.admin, True), (self.student, False)]:
            self.client.force_authenticate(user)
            self.assertEqual(self.client.get(URL).data[0]["can_edit"], expected, user.username)
        self.client.force_authenticate(None)
        self.assertFalse(self.client.get(URL).data[0]["can_edit"])

    def test_notice_survives_deleted_author(self):
        self.staff.delete()
        res = self.client.get(URL)
        self.assertEqual(res.data[0]["author_name"], "Transport Office")
