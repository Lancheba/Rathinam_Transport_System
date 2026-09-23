from rest_framework import viewsets, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from accounts.permissions import CanManageBuses, can_manage_buses
from attendance.permissions import driver_bus, is_driver
from buses.models import Bus
from .models import Student
from .permissions import CanManageOwnBusStudents
from .serializers import StudentSerializer, StudentBriefSerializer


class StudentViewSet(viewsets.ModelViewSet):
    """
    Student roster, keyed to a bus.

    Student names, phone numbers and roll numbers are personal data. Admins
    and transport staff can see and manage every student, the same as
    before. A driver can also see, add, edit and delete students — but only
    on their own bus: get_queryset below is what actually enforces that
    boundary (a driver requesting another bus's student by id just won't
    find it), the permission class alone is not enough.
    """

    queryset = Student.objects.select_related("bus").all()
    serializer_class = StudentSerializer
    permission_classes = [CanManageOwnBusStudents]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "roll_number", "department"]

    def _driver_only(self):
        """True when the caller is a driver acting on their own bus, not staff/admin."""
        return is_driver(self.request.user) and not can_manage_buses(self.request.user)

    def get_queryset(self):
        qs = super().get_queryset()
        if self._driver_only():
            bus = driver_bus(self.request.user)
            return qs.filter(bus=bus) if bus else qs.none()

        bus_id = self.request.query_params.get("bus")
        unassigned = self.request.query_params.get("unassigned")
        if bus_id:
            qs = qs.filter(bus_id=bus_id)
        if unassigned is not None and unassigned.lower() == "true":
            qs = qs.filter(bus__isnull=True)
        return qs

    def perform_create(self, serializer):
        if self._driver_only():
            bus = driver_bus(self.request.user)
            if not bus:
                raise ValidationError({"detail": "Link your bus before adding students."})
            # Whatever "bus" was submitted (if any) is ignored — a driver can only add to their own cab.
            serializer.save(bus=bus)
        else:
            serializer.save()

    def perform_update(self, serializer):
        if self._driver_only():
            # Edits are allowed, but a driver can never move a student onto a different bus.
            serializer.save(bus=driver_bus(self.request.user))
        else:
            serializer.save()

    @action(detail=False, methods=["get"], url_path="roster", permission_classes=[CanManageBuses])
    def roster(self, request):
        """
        One row per bus with its student count and the full student list,
        so transport staff can see every bus's roster in a single call
        instead of querying each of the 32 buses one at a time.
        """
        buses = Bus.objects.all().order_by("bus_number").prefetch_related("students")
        data = [
            {
                "bus_id": bus.id,
                "bus_number": bus.bus_number,
                "route": bus.route,
                "student_count": bus.students.count(),
                "students": StudentBriefSerializer(
                    bus.students.all().order_by("roll_number"), many=True
                ).data,
            }
            for bus in buses
        ]
        return Response(data)


@api_view(["GET"])
@permission_classes([CanManageBuses])
def student_summary(request):
    """Small aggregate for the main dashboard's metric card — no student PII."""
    total = Student.objects.count()
    assigned = Student.objects.filter(bus__isnull=False).count()
    return Response({
        "total": total,
        "assigned": assigned,
        "unassigned": total - assigned,
        "buses_with_students": Bus.objects.filter(students__isnull=False).distinct().count(),
    })
