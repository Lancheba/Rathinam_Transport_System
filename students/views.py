from rest_framework import viewsets, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from accounts.permissions import CanManageBuses
from buses.models import Bus
from .models import Student
from .serializers import StudentSerializer, StudentBriefSerializer


class StudentViewSet(viewsets.ModelViewSet):
    """
    Student roster, keyed to a bus.

    Student names, phone numbers and roll numbers are personal data, so every
    action here — including plain reads — is restricted to admins and
    transport staff (the same people who manage buses), not the public
    AllowAny the Bus/ParkingSlot endpoints use.
    """

    queryset = Student.objects.select_related("bus").all()
    serializer_class = StudentSerializer
    permission_classes = [CanManageBuses]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "roll_number", "department"]

    def get_queryset(self):
        qs = super().get_queryset()
        bus_id = self.request.query_params.get("bus")
        unassigned = self.request.query_params.get("unassigned")
        if bus_id:
            qs = qs.filter(bus_id=bus_id)
        if unassigned is not None and unassigned.lower() == "true":
            qs = qs.filter(bus__isnull=True)
        return qs

    @action(detail=False, methods=["get"], url_path="roster")
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
