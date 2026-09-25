from django.contrib.auth.models import User
from django.test import TestCase, Client

from buses.models import Bus
from students.models import FaceProfile, FaceProfileAudit, Student

EMBEDDING = [0.05] * 128


class FaceProfileAdminReadAuditTests(TestCase):
    def setUp(self):
        bus = Bus.objects.create(
            bus_number="ADM1", route="Admin test route", rfid_uid="RFID-ADM1",
            departure_time="08:00", length_m="10.00", width_m="2.50",
        )
        student_user = User.objects.create_user("admin_target_student", password="pass1234")
        self.student = Student.objects.create(name="Admin Target", roll_number="ADM001", bus=bus, linked_user=student_user)
        self.profile = FaceProfile.objects.create(student=self.student, embedding=EMBEDDING, consent_given=True)

        self.admin_user = User.objects.create_superuser("siteadmin", "admin@example.com", "pass1234")
        self.client = Client()
        self.client.login(username="siteadmin", password="pass1234")

    def test_opening_a_face_profile_in_admin_writes_an_admin_read_row(self):
        url = f"/admin/students/faceprofile/{self.profile.pk}/change/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        rows = FaceProfileAudit.objects.filter(student=self.student, action=FaceProfileAudit.ADMIN_READ)
        self.assertEqual(rows.count(), 1)
        self.assertEqual(rows.first().actor, self.admin_user)

    def test_opening_it_twice_writes_two_rows(self):
        url = f"/admin/students/faceprofile/{self.profile.pk}/change/"
        self.client.get(url)
        self.client.get(url)
        rows = FaceProfileAudit.objects.filter(student=self.student, action=FaceProfileAudit.ADMIN_READ)
        self.assertEqual(rows.count(), 2)

    def test_saving_in_admin_does_not_add_an_extra_admin_read_row(self):
        url = f"/admin/students/faceprofile/{self.profile.pk}/change/"
        self.client.get(url)
        self.client.post(url, {
            "student": self.student.pk,
            "embedding_model": "face-api-128d",
            "retake_count": 0,
            "consent_given": "on",
        })
        rows = FaceProfileAudit.objects.filter(student=self.student, action=FaceProfileAudit.ADMIN_READ)
        self.assertEqual(rows.count(), 1)
