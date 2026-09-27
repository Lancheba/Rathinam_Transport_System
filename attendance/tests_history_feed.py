"""
Tests for attendance/history_views.py::history_feed (item #6 audit gap --
this module had 19 lines and 11 uncovered, i.e. essentially no test file).
"""
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import HistoryEvent
from .tests import make_bus, make_user


class HistoryFeedTests(APITestCase):
    url = "/api/attendance/history/"

    def setUp(self):
        self.admin = make_user("histadmin", None)
        self.admin.is_staff = True
        self.admin.save(update_fields=["is_staff"])
        self.student = make_user("histstudent", "STUDENT")

        self.bus_a = make_bus("H1")
        self.bus_b = make_bus("H2")

        self.event_a = HistoryEvent.objects.create(
            bus=self.bus_a, event_type="MANUAL_MARK", description="Marked present manually",
        )
        self.event_b = HistoryEvent.objects.create(
            bus=self.bus_b, event_type="QR_SESSION_OPENED", description="Session opened",
        )

    def test_non_staff_cannot_view_history(self):
        self.client.force_authenticate(self.student)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 403)

    def test_staff_sees_all_events_by_default(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 2)

    def test_filter_by_bus(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get(self.url, {"bus": self.bus_a.pk})
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["event_type"], "MANUAL_MARK")

    def test_filter_by_event_type_is_case_insensitive(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get(self.url, {"event_type": "qr_session_opened"})
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["event_type"], "QR_SESSION_OPENED")

    def test_filter_by_date(self):
        self.client.force_authenticate(self.admin)
        # created_at is stored as a UTC-aware datetime; the view's ?date=
        # filter (created_at__date) is evaluated in the project's local
        # timezone (settings.TIME_ZONE="Asia/Kolkata", USE_TZ=True), so the
        # expected date string must be the localized calendar date rather
        # than the raw UTC date -- otherwise this flakes near the UTC/IST
        # day boundary, where the two dates disagree.
        today = timezone.localtime(self.event_a.created_at).date().isoformat()
        res = self.client.get(self.url, {"date": today})
        self.assertEqual(len(res.data), 2)

        res_other_day = self.client.get(self.url, {"date": "2000-01-01"})
        self.assertEqual(len(res_other_day.data), 0)

    def test_result_is_capped_at_200(self):
        HistoryEvent.objects.all().delete()
        for i in range(205):
            HistoryEvent.objects.create(bus=self.bus_a, event_type="MANUAL_MARK", description=f"Event {i}")
        self.client.force_authenticate(self.admin)
        res = self.client.get(self.url)
        self.assertEqual(len(res.data), 200)
