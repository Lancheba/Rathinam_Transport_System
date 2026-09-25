from datetime import timedelta

from django.contrib.auth.models import User
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from config.settings import SIMPLE_JWT

LOGIN_URL = "/api/auth/token/"
LOGOUT_URL = "/api/auth/logout/"
REFRESH_URL = "/api/auth/refresh/"


class LogoutAndTokenLifetimeTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user("jwtuser", password="pass1234")

    def _tokens(self):
        refresh = RefreshToken.for_user(self.user)
        return str(refresh), str(refresh.access_token)

    def test_access_token_lifetime_is_short(self):
        self.assertLessEqual(SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"], timedelta(minutes=30))

    def test_logout_blacklists_refresh_token(self):
        refresh, access = self._tokens()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        r = self.client.post(LOGOUT_URL, {"refresh": refresh}, format="json")
        self.assertEqual(r.status_code, 205)

        r2 = self.client.post(REFRESH_URL, {"refresh": refresh}, format="json")
        self.assertEqual(r2.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_requires_authentication(self):
        refresh, _ = self._tokens()
        r = self.client.post(LOGOUT_URL, {"refresh": refresh}, format="json")
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_without_refresh_field_rejected(self):
        _, access = self._tokens()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        r = self.client.post(LOGOUT_URL, {}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_refresh_rotates_and_old_refresh_is_blacklisted(self):
        refresh, _ = self._tokens()
        r = self.client.post(REFRESH_URL, {"refresh": refresh}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn("refresh", r.data)  # ROTATE_REFRESH_TOKENS returns a new one

        r2 = self.client.post(REFRESH_URL, {"refresh": refresh}, format="json")
        self.assertEqual(r2.status_code, status.HTTP_401_UNAUTHORIZED)
