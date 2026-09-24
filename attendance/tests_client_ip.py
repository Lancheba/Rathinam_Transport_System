from unittest.mock import patch

from django.test import RequestFactory, SimpleTestCase
from rest_framework.settings import api_settings

from attendance.net import client_ip


class ClientIpTests(SimpleTestCase):
    def _req(self, xff=None, remote="10.0.0.1"):
        extra = {"REMOTE_ADDR": remote}
        if xff is not None:
            extra["HTTP_X_FORWARDED_FOR"] = xff
        return RequestFactory().get("/", **extra)

    def test_plain_remote_addr(self):
        with patch.object(api_settings, "NUM_PROXIES", 0, create=True):
            self.assertEqual(client_ip(self._req(remote="203.0.113.5")), "203.0.113.5")

    def test_one_proxy_ignores_client_supplied_first_entry(self):
        with patch.object(api_settings, "NUM_PROXIES", 1, create=True):
            req = self._req(xff="6.6.6.6, 198.51.100.7")
            self.assertEqual(client_ip(req), "198.51.100.7")

    def test_garbage_header_never_returned(self):
        with patch.object(api_settings, "NUM_PROXIES", 1, create=True):
            req = self._req(xff="not-an-ip", remote="10.0.0.9")
            self.assertEqual(client_ip(req), "10.0.0.9")

    def test_no_usable_address_returns_none(self):
        with patch.object(api_settings, "NUM_PROXIES", 0, create=True):
            self.assertIsNone(client_ip(self._req(remote="")))