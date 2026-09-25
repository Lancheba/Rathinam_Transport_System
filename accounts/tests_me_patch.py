from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

ME_URL = "/api/auth/me/"


class MePatchTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("phoneuser", password="pass1234")
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_patch_sets_phone_number(self):
        r = self.client.patch(ME_URL, {"phone": "+91 9876543210"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        self.assertEqual(r.data["phone"], "+91 9876543210")
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.phone, "+91 9876543210")

    def test_patch_rejects_invalid_phone(self):
        r = self.client.patch(ME_URL, {"phone": "not-a-phone!!"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patch_can_clear_phone(self):
        self.user.profile.phone = "12345"
        self.user.profile.save(update_fields=["phone"])
        r = self.client.patch(ME_URL, {"phone": ""}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.phone, "")

    def test_patch_requires_authentication(self):
        self.client.force_authenticate(None)
        r = self.client.patch(ME_URL, {"phone": "12345678"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)
