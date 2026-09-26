from rest_framework.exceptions import ValidationError
from rest_framework.test import APIRequestFactory
from django.test import SimpleTestCase

from utils.params import int_param, date_param


class IntParamTests(SimpleTestCase):
    def _params(self, **kw):
        return APIRequestFactory().get("/", kw).GET

    def test_absent_returns_default(self):
        self.assertEqual(int_param(self._params(), "page", default=1), 1)

    def test_blank_returns_default(self):
        self.assertEqual(int_param(self._params(page=""), "page", default=1), 1)

    def test_valid_int_parsed(self):
        self.assertEqual(int_param(self._params(page="7"), "page"), 7)

    def test_invalid_int_raises_validation_error(self):
        with self.assertRaises(ValidationError):
            int_param(self._params(page="abc"), "page")


class DateParamTests(SimpleTestCase):
    def _params(self, **kw):
        return APIRequestFactory().get("/", kw).GET

    def test_absent_returns_default(self):
        self.assertIsNone(date_param(self._params(), "from"))

    def test_blank_returns_default(self):
        self.assertIsNone(date_param(self._params(**{"from": ""}), "from"))

    def test_valid_date_parsed(self):
        result = date_param(self._params(**{"from": "2026-01-15"}), "from")
        self.assertEqual(str(result), "2026-01-15")

    def test_invalid_date_raises_validation_error(self):
        with self.assertRaises(ValidationError):
            date_param(self._params(**{"from": "not-a-date"}), "from")
