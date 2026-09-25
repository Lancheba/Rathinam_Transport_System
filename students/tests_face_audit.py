from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from buses.models import Bus
from students.models import FaceProfileAudit, Student

EMBEDDING = [0.05] * 128
ENROLL_URL = "/api/students/me/face-enrollment/"


def make_student_user():
    bus = Bus.objects.create(
        bus_number="AUD1", route="Audit test route", rfid_uid="RFID-AUD1",
        departure_time="08:00", length_m="10.00", width_m="2.50",
    )
    user = User.objects.create_user("audit_student", password="pass1234")
    user.profile.role = "STUDENT"
    user.profile.save()
    student = Student.objects.create(name="Audit Student", roll_number="AUD001", bus=bus, linked_user=user)
    return user, student


class FaceProfileAuditTests(TestCase):
    def setUp(self):
        self.user, self.student = make_student_user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_enroll_writes_one_audit_row(self):
        r = self.client.post(ENROLL_URL, {"embedding": EMBEDDING, "consent": True}, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        rows = FaceProfileAudit.objects.filter(student=self.student)
        self.assertEqual(rows.count(), 1)
        self.assertEqual(rows.first().action, FaceProfileAudit.ENROLL)
        self.assertEqual(rows.first().actor, self.user)

    def test_reenroll_writes_a_reenroll_row(self):
        self.client.post(ENROLL_URL, {"embedding": EMBEDDING, "consent": True}, format="json")
        r = self.client.post(ENROLL_URL, {"embedding": EMBEDDING, "consent": True}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        actions = list(
            FaceProfileAudit.objects.filter(student=self.student)
            .order_by("created_at").values_list("action", flat=True)
        )
        self.assertEqual(actions, [FaceProfileAudit.ENROLL, FaceProfileAudit.REENROLL])

    def test_delete_writes_a_delete_row(self):
        self.client.post(ENROLL_URL, {"embedding": EMBEDDING, "consent": True}, format="json")
        r = self.client.delete(ENROLL_URL)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        actions = list(
            FaceProfileAudit.objects.filter(student=self.student)
            .order_by("created_at").values_list("action", flat=True)
        )
        self.assertEqual(actions, [FaceProfileAudit.ENROLL, FaceProfileAudit.DELETE])

    def test_delete_with_no_profile_writes_nothing(self):
        r = self.client.delete(ENROLL_URL)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(FaceProfileAudit.objects.filter(student=self.student).count(), 0)

    def test_audit_rows_are_append_only(self):
        self.client.post(ENROLL_URL, {"embedding": EMBEDDING, "consent": True}, format="json")
        row = FaceProfileAudit.objects.get(student=self.student)
        row.action = FaceProfileAudit.DELETE
        with self.assertRaises(ValueError):
            row.save()

    def test_audit_rows_cannot_be_deleted(self):
        self.client.post(ENROLL_URL, {"embedding": EMBEDDING, "consent": True}, format="json")
        row = FaceProfileAudit.objects.get(student=self.student)
        with self.assertRaises(ValueError):
            row.delete()
