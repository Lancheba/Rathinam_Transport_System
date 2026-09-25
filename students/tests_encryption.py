from django.contrib.auth.models import User
from django.db import connection
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from buses.models import Bus
from students.fields import EncryptedListField
from students.models import FaceProfile, Student

EMBEDDING = [0.05] * 128
ENROLL_URL = "/api/students/me/face-enrollment/"


def make_student_user():
    bus = Bus.objects.create(
        bus_number="ENC1", route="Encryption test route", rfid_uid="RFID-ENC1",
        departure_time="08:00", length_m="10.00", width_m="2.50",
    )
    user = User.objects.create_user("enc_student", password="pass1234")
    user.profile.role = "STUDENT"
    user.profile.save()
    student = Student.objects.create(name="Enc Student", roll_number="ENC001", bus=bus, linked_user=user)
    return user, student


class FaceEmbeddingEncryptionTests(APITestCase):
    def test_column_on_disk_is_not_plaintext_json(self):
        _, student = make_student_user()
        FaceProfile.objects.create(student=student, embedding=EMBEDDING, consent_given=True)
        with connection.cursor() as cursor:
            cursor.execute("SELECT embedding FROM students_faceprofile WHERE student_id = %s", [student.pk])
            raw = cursor.fetchone()[0]
        self.assertNotIn("0.05", raw)          # plaintext floats must not appear
        self.assertFalse(raw.strip().startswith("["))  # not a JSON array on disk

    def test_round_trips_through_the_orm_unchanged(self):
        _, student = make_student_user()
        profile = FaceProfile.objects.create(student=student, embedding=EMBEDDING, consent_given=True)
        reloaded = FaceProfile.objects.get(pk=profile.pk)
        self.assertEqual(reloaded.embedding, EMBEDDING)

    def test_wrong_key_cannot_decrypt(self):
        _, student = make_student_user()
        FaceProfile.objects.create(student=student, embedding=EMBEDDING, consent_given=True)
        from cryptography.fernet import Fernet, InvalidToken
        with override_settings(FACE_EMBEDDING_KEY=Fernet.generate_key().decode()):
            with self.assertRaises(InvalidToken):
                FaceProfile.objects.get(student=student).embedding

    def test_enrollment_endpoint_still_works_end_to_end(self):
        user, student = make_student_user()
        self.client.force_authenticate(user)
        r = self.client.post(ENROLL_URL, {"embedding": EMBEDDING, "consent": True}, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        profile = FaceProfile.objects.get(student=student)
        self.assertEqual(profile.embedding, EMBEDDING)
        with connection.cursor() as cursor:
            cursor.execute("SELECT embedding FROM students_faceprofile WHERE student_id = %s", [student.pk])
            raw = cursor.fetchone()[0]
        self.assertFalse(raw.strip().startswith("["))

    def test_delete_endpoint_clears_embedding(self):
        user, student = make_student_user()
        FaceProfile.objects.create(student=student, embedding=EMBEDDING, consent_given=True)
        self.client.force_authenticate(user)
        r = self.client.delete(ENROLL_URL)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        profile = FaceProfile.objects.get(student=student)
        self.assertEqual(profile.embedding, [])
