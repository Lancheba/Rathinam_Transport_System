from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

REGISTER_URL = "/api/auth/register/"


class RegisterValidationTests(APITestCase):
    def _payload(self, **overrides):
        data = {"username": "newperson", "email": "new@example.com", "password": "Str0ng!Passw0rd"}
        data.update(overrides)
        return data

    def test_weak_password_rejected(self):
        r = self.client.post(REGISTER_URL, self._payload(password="password"), format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(username="newperson").exists())

    def test_numeric_password_rejected(self):
        r = self.client.post(REGISTER_URL, self._payload(password="48291037561"), format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_strong_password_accepted(self):
        r = self.client.post(REGISTER_URL, self._payload(), format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)

    def test_duplicate_email_rejected(self):
        User.objects.create_user("existing", email="dupe@example.com", password="whatever")
        r = self.client.post(REGISTER_URL, self._payload(username="another", email="dupe@example.com"), format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_email_case_insensitive(self):
        User.objects.create_user("existing2", email="Dupe2@Example.com", password="whatever")
        r = self.client.post(REGISTER_URL, self._payload(username="another2", email="dupe2@example.com"), format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_email_rejected(self):
        r = self.client.post(REGISTER_URL, self._payload(email=""), format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
