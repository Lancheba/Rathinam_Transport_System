from django.contrib.auth.models import User
from django.core.exceptions import PermissionDenied
from django.db import IntegrityError, transaction
from django.test import TestCase

from accounts.linking import (
    LinkError,
    approve,
    reject,
    request_bus_claim,
    request_teacher_link,
)
from accounts.models import LinkRequest
from attendance.models import Teacher
from buses.models import Bus


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


class TeacherLinkTests(TestCase):
    def setUp(self):
        self.teacher = Teacher.objects.create(name="Mr T", staff_id="T100")
        self.user = make_user("teach1", identity="TEACHER")
        self.staff = make_user("staff1", role="STAFF")

    def test_request_creates_pending_and_links_nothing(self):
        lr = request_teacher_link(self.user, "T100")
        self.assertEqual(lr.status, LinkRequest.PENDING)
        self.teacher.refresh_from_db()
        self.assertIsNone(self.teacher.linked_user)

    def test_unknown_staff_id_is_refused(self):
        with self.assertRaises(LinkError):
            request_teacher_link(self.user, "NOPE")

    def test_blank_staff_id_is_refused(self):
        with self.assertRaises(LinkError):
            request_teacher_link(self.user, "   ")

    def test_staff_id_lookup_ignores_case(self):
        lr = request_teacher_link(self.user, "t100")
        self.assertEqual(lr.teacher_id, self.teacher.pk)

    def test_teacher_already_linked_to_someone_else_is_refused(self):
        other = make_user("teach2", identity="TEACHER")
        self.teacher.linked_user = other
        self.teacher.save()
        with self.assertRaises(LinkError):
            request_teacher_link(self.user, "T100")

    def test_new_request_replaces_the_old_pending_one(self):
        Teacher.objects.create(name="Ms U", staff_id="T200")
        first = request_teacher_link(self.user, "T100")
        second = request_teacher_link(self.user, "T200")
        first.refresh_from_db()
        self.assertEqual(first.status, LinkRequest.CANCELLED)
        self.assertEqual(second.status, LinkRequest.PENDING)

    def test_approve_links_the_teacher_and_sets_identity(self):
        lr = request_teacher_link(self.user, "T100")
        approve(lr, self.staff, note="checked ID card")
        self.teacher.refresh_from_db()
        self.user.profile.refresh_from_db()
        lr.refresh_from_db()
        self.assertEqual(self.teacher.linked_user_id, self.user.pk)
        self.assertEqual(self.user.profile.identity, "TEACHER")
        self.assertEqual(lr.status, LinkRequest.APPROVED)
        self.assertEqual(lr.decided_by_id, self.staff.pk)
        self.assertIsNotNone(lr.decided_at)

    def test_approving_twice_is_refused(self):
        lr = request_teacher_link(self.user, "T100")
        approve(lr, self.staff)
        with self.assertRaises(LinkError):
            approve(lr, self.staff)

    def test_reject_links_nothing(self):
        lr = request_teacher_link(self.user, "T100")
        reject(lr, self.staff, note="not your staff id")
        self.teacher.refresh_from_db()
        lr.refresh_from_db()
        self.assertIsNone(self.teacher.linked_user)
        self.assertEqual(lr.status, LinkRequest.REJECTED)

    def test_approving_one_rejects_rival_requests_for_the_same_teacher(self):
        rival_user = make_user("teach3", identity="TEACHER")
        mine = request_teacher_link(self.user, "T100")
        rival = request_teacher_link(rival_user, "T100")
        approve(mine, self.staff)
        rival.refresh_from_db()
        self.assertEqual(rival.status, LinkRequest.REJECTED)

    def test_approve_fails_if_teacher_was_linked_in_the_meantime(self):
        lr = request_teacher_link(self.user, "T100")
        other = make_user("teach4", identity="TEACHER")
        Teacher.objects.filter(pk=self.teacher.pk).update(linked_user=other)
        with self.assertRaises(LinkError):
            approve(lr, self.staff)
        lr.refresh_from_db()
        self.assertEqual(lr.status, LinkRequest.PENDING)

    def test_students_cannot_approve(self):
        lr = request_teacher_link(self.user, "T100")
        with self.assertRaises(PermissionDenied):
            approve(lr, make_user("stud1"))


class DriverClaimTests(TestCase):
    def setUp(self):
        self.driver = make_user("drv1", role="DRIVER")
        self.staff = make_user("staff2", role="STAFF")
        self.bus = make_bus("B1")

    def test_only_drivers_can_ask_for_a_bus(self):
        with self.assertRaises(LinkError):
            request_bus_claim(make_user("stud2"), "B1")

    def test_request_does_not_assign_the_bus(self):
        lr = request_bus_claim(self.driver, "b1")
        self.bus.refresh_from_db()
        self.assertEqual(lr.status, LinkRequest.PENDING)
        self.assertIsNone(self.bus.driver)

    def test_unknown_bus_is_refused(self):
        with self.assertRaises(LinkError):
            request_bus_claim(self.driver, "ZZZ")

    def test_bus_with_another_driver_is_refused(self):
        make_bus("B2", driver=make_user("drv2", role="DRIVER"))
        with self.assertRaises(LinkError):
            request_bus_claim(self.driver, "B2")

    def test_approve_assigns_the_bus(self):
        lr = request_bus_claim(self.driver, "B1")
        approve(lr, self.staff)
        self.bus.refresh_from_db()
        self.assertEqual(self.bus.driver_id, self.driver.pk)

    def test_approve_moves_a_driver_off_their_old_bus(self):
        old = make_bus("B0", driver=self.driver)
        lr = request_bus_claim(self.driver, "B1")
        approve(lr, self.staff)
        old.refresh_from_db()
        self.bus.refresh_from_db()
        self.assertIsNone(old.driver)
        self.assertEqual(self.bus.driver_id, self.driver.pk)

    def test_approving_one_driver_rejects_rival_claims_on_the_same_bus(self):
        rival_driver = make_user("drv3", role="DRIVER")
        mine = request_bus_claim(self.driver, "B1")
        rival = request_bus_claim(rival_driver, "B1")
        approve(mine, self.staff)
        rival.refresh_from_db()
        self.assertEqual(rival.status, LinkRequest.REJECTED)

    def test_approve_fails_if_bus_got_a_driver_in_the_meantime(self):
        lr = request_bus_claim(self.driver, "B1")
        Bus.objects.filter(pk=self.bus.pk).update(driver=make_user("drv4", role="DRIVER"))
        with self.assertRaises(LinkError):
            approve(lr, self.staff)


class LinkRequestConstraintTests(TestCase):
    def test_teacher_request_without_a_teacher_is_rejected_by_the_database(self):
        user = make_user("c1")
        with self.assertRaises(IntegrityError), transaction.atomic():
            LinkRequest.objects.create(user=user, kind=LinkRequest.TEACHER)

    def test_two_pending_requests_of_one_kind_are_rejected_by_the_database(self):
        user = make_user("c2")
        t1 = Teacher.objects.create(name="A", staff_id="C1")
        t2 = Teacher.objects.create(name="B", staff_id="C2")
        LinkRequest.objects.create(user=user, kind=LinkRequest.TEACHER, teacher=t1)
        with self.assertRaises(IntegrityError), transaction.atomic():
            LinkRequest.objects.create(user=user, kind=LinkRequest.TEACHER, teacher=t2)
