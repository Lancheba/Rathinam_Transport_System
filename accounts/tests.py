import time
import unittest.mock as mock

from django.core.cache import cache
from django.test import TestCase, override_settings
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status

from config import login_lockout

LOGIN_URL = '/api/auth/login/'

FAST_LOCKOUT = dict(
    LOGIN_LOCKOUT_MAX_FAILURES=3,
    LOGIN_LOCKOUT_WINDOW_SECONDS=60,
    LOGIN_LOCKOUT_SECONDS=300,
)


class LockoutUnitTests(TestCase):
    def setUp(self):
        cache.clear()

    def _fail(self, username, n=1):
        for _ in range(n):
            login_lockout.register_failure(username)

    def test_normalize_strips_and_lowercases(self):
        self.assertEqual(login_lockout.normalize('  Admin  '), 'admin')

    def test_normalize_non_string_returns_empty(self):
        self.assertEqual(login_lockout.normalize(None), '')
        self.assertEqual(login_lockout.normalize(42), '')

    def test_not_locked_initially(self):
        self.assertEqual(login_lockout.seconds_locked('alice'), 0)

    def test_single_failure_does_not_lock(self):
        self._fail('alice')
        self.assertEqual(login_lockout.seconds_locked('alice'), 0)

    @override_settings(**FAST_LOCKOUT)
    def test_locked_after_max_failures(self):
        self._fail('alice', 3)
        self.assertGreater(login_lockout.seconds_locked('alice'), 0)

    @override_settings(**FAST_LOCKOUT)
    def test_locked_seconds_is_positive(self):
        self._fail('alice', 3)
        secs = login_lockout.seconds_locked('alice')
        self.assertGreaterEqual(secs, 1)
        self.assertLessEqual(secs, 300)

    @override_settings(**FAST_LOCKOUT)
    def test_clear_failures_removes_lock(self):
        self._fail('alice', 3)
        self.assertGreater(login_lockout.seconds_locked('alice'), 0)
        login_lockout.clear_failures('alice')
        self.assertEqual(login_lockout.seconds_locked('alice'), 0)

    def test_clear_failures_is_idempotent_when_not_locked(self):
        login_lockout.clear_failures('nobody')
        self.assertEqual(login_lockout.seconds_locked('nobody'), 0)

    @override_settings(**FAST_LOCKOUT)
    def test_lockout_is_case_insensitive(self):
        self._fail('Alice', 3)
        self.assertGreater(login_lockout.seconds_locked('alice'), 0)
        self.assertGreater(login_lockout.seconds_locked('ALICE'), 0)

    def test_empty_username_never_locked(self):
        login_lockout.register_failure('')
        self.assertEqual(login_lockout.seconds_locked(''), 0)

    def test_none_username_never_locked(self):
        login_lockout.register_failure(None)
        self.assertEqual(login_lockout.seconds_locked(None), 0)

    @override_settings(**FAST_LOCKOUT)
    def test_lockout_does_not_affect_other_users(self):
        self._fail('alice', 3)
        self.assertGreater(login_lockout.seconds_locked('alice'), 0)
        self.assertEqual(login_lockout.seconds_locked('bob'), 0)

    @override_settings(**FAST_LOCKOUT)
    def test_counter_resets_after_clear_and_can_lock_again(self):
        self._fail('alice', 2)
        login_lockout.clear_failures('alice')
        self._fail('alice', 2)
        self.assertEqual(login_lockout.seconds_locked('alice'), 0)
        login_lockout.register_failure('alice')
        self.assertGreater(login_lockout.seconds_locked('alice'), 0)


class LoginLockoutAPITests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser', password='StrongP@ss1', email='t@example.com'
        )

    def _login(self, password='wrong'):
        return self.client.post(
            LOGIN_URL,
            {'username': 'testuser', 'password': password},
            format='json',
        )

    def test_correct_credentials_return_200(self):
        r = self._login('StrongP@ss1')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn('access', r.data)

    def test_wrong_password_returns_401(self):
        r = self._login('wrong')
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    @override_settings(**FAST_LOCKOUT)
    def test_locked_out_after_max_failures(self):
        for _ in range(3):
            self._login('wrong')
        r = self._login('wrong')
        self.assertEqual(r.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    @override_settings(**FAST_LOCKOUT)
    def test_locked_out_returns_retry_after_header(self):
        for _ in range(3):
            self._login('wrong')
        r = self._login('wrong')
        self.assertIn('Retry-After', r)

    @override_settings(**FAST_LOCKOUT)
    def test_correct_password_rejected_while_locked(self):
        for _ in range(3):
            self._login('wrong')
        r = self._login('StrongP@ss1')
        self.assertEqual(r.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    @override_settings(**FAST_LOCKOUT)
    def test_successful_login_clears_failure_count(self):
        self._login('wrong')
        self._login('wrong')
        self._login('StrongP@ss1')
        self._login('wrong')
        self._login('wrong')
        r = self._login('StrongP@ss1')
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    @override_settings(**FAST_LOCKOUT)
    def test_lockout_is_per_username(self):
        User.objects.create_user(
            username='other', password='StrongP@ss1', email='o@example.com'
        )
        for _ in range(3):
            self._login('wrong')
        r = self.client.post(
            LOGIN_URL,
            {'username': 'other', 'password': 'StrongP@ss1'},
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_missing_username_returns_400(self):
        r = self.client.post(LOGIN_URL, {'password': 'x'}, format='json')
        self.assertIn(r.status_code, [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_401_UNAUTHORIZED,
        ])

    @override_settings(**FAST_LOCKOUT)
    def test_lockout_holds_regardless_of_ip_header(self):
        for _ in range(3):
            self._login('wrong')
        self.client.credentials(HTTP_X_FORWARDED_FOR='1.2.3.4')
        r = self._login('wrong')
        self.assertEqual(r.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
