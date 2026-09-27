"""
Enforces the pagination convention documented in CONTRIBUTING.md.

There is no DEFAULT_PAGINATION_CLASS (see the comment on REST_FRAMEWORK in
config/settings.py for why). That means every router-registered ViewSet is
personally responsible for not returning an unbounded list. This test walks
every ViewSet actually registered on a router and checks each one falls into
one of two allowed buckets:

  1. Its get_queryset() is overridden and its source contains a slice
     ("[:") -- the LIST_LIMIT pattern used by announcements/feedback/etc.
  2. It is explicitly listed in EXPECTED_UNCAPPED below, with a one-line
     reason why returning its full queryset is fine (a naturally small,
     institution-scale table rather than something a user or attacker can
     grow without bound).

If a new ViewSet is registered that is neither capped nor allow-listed,
this test fails -- forcing a deliberate choice instead of an accidental
unbounded response, which is exactly the gap item #9 of the audit flagged.
"""
import inspect

from django.test import SimpleTestCase

from announcements.views import AnnouncementViewSet
from attendance.views import TeacherViewSet
from buses.views import BusViewSet
from feedback.views import FeedbackViewSet
from maintenance.views import MaintenanceLogViewSet
from parking.views import ParkingGroundViewSet, ParkingSlotViewSet
from sensors.views import ParkingEventViewSet, SensorViewSet
from students.views import StudentViewSet

# (ViewSet class, reason it's allowed to return its full queryset unpaginated)
EXPECTED_UNCAPPED = {
    BusViewSet: "bounded by the number of buses the college actually runs",
    TeacherViewSet: "bounded by the number of teachers/in-charges on staff",
    ParkingGroundViewSet: "bounded by the number of physical parking grounds",
    ParkingSlotViewSet: "bounded by the number of physical parking slots",
    SensorViewSet: "bounded by the number of physical sensors installed",
    MaintenanceLogViewSet: "bounded by real-world maintenance activity, not user input",
    StudentViewSet: "bounded by college enrollment (~thousands, not attacker-influenced)",
}

# All ViewSets actually registered on a router, across every app's urls.py.
REGISTERED_VIEWSETS = [
    AnnouncementViewSet,
    TeacherViewSet,
    BusViewSet,
    FeedbackViewSet,
    MaintenanceLogViewSet,
    ParkingGroundViewSet,
    ParkingSlotViewSet,
    SensorViewSet,
    ParkingEventViewSet,
    StudentViewSet,
]


class PaginationConventionTests(SimpleTestCase):
    def test_every_registered_viewset_is_capped_or_allowlisted(self):
        uncapped_and_not_allowlisted = []

        for viewset in REGISTERED_VIEWSETS:
            get_queryset = getattr(viewset, "get_queryset", None)
            is_overridden = (
                get_queryset is not None
                and getattr(get_queryset, "__qualname__", "").startswith(viewset.__name__)
            )
            source = inspect.getsource(get_queryset) if is_overridden else ""
            is_capped = "[:" in source

            if not is_capped and viewset not in EXPECTED_UNCAPPED:
                uncapped_and_not_allowlisted.append(viewset.__name__)

        self.assertEqual(
            uncapped_and_not_allowlisted,
            [],
            "These router-registered ViewSets have no queryset cap and are not "
            "in EXPECTED_UNCAPPED -- either cap them with a LIST_LIMIT slice, "
            "or add them to EXPECTED_UNCAPPED with a reason (see CONTRIBUTING.md): "
            f"{uncapped_and_not_allowlisted}",
        )

    def test_allowlist_entries_still_exist_as_registered_viewsets(self):
        # Catches stale allow-list entries (e.g. a ViewSet that got renamed
        # or removed) so EXPECTED_UNCAPPED doesn't quietly rot.
        stale = [vs.__name__ for vs in EXPECTED_UNCAPPED if vs not in REGISTERED_VIEWSETS]
        self.assertEqual(stale, [], f"Allow-listed ViewSets no longer registered on any router: {stale}")
