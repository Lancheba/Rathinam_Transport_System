from rest_framework import viewsets, filters, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from accounts.permissions import CanManageBuses, can_manage_buses, IsStudent
from attendance.permissions import driver_bus, is_driver
from buses.models import Bus
from .models import Student
from .permissions import CanManageOwnBusStudents
from .serializers import StudentSerializer, StudentBriefSerializer, StudentSelfSerializer


class StudentViewSet(viewsets.ModelViewSet):
    """
    Student roster, keyed to a bus.

    Student names, phone numbers and roll numbers are personal data. Admins
    and transport staff can see and manage every student, the same as
    before. Drivers get read-only access to their own bus's roster: get_queryset below
    enforces that boundary (a driver requesting another bus's student by id just
    won't find it), and the permission class blocks every driver write.
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


class MyStudentLinkView(APIView):
    """
    Self-service link between a STUDENT-role login and their own row in the
    roster, by roll number — this is what lets a student's "am I marked
    present/absent" screen know which roster row is theirs without an admin
    having to set it up for every account by hand.

    GET    -> the roster row linked to this account, or null if not linked yet.
    POST   -> link this account to a roll number (one-time; fails if that
              roll number is already linked to a different account).
    DELETE -> unlink, e.g. if the wrong roll number was entered by mistake.
    """

    permission_classes = [IsStudent]

    def get(self, request):
        student = getattr(request.user, "student_profile", None)
        return Response({"linked": student is not None, "student": StudentSelfSerializer(student).data if student else None})

    def post(self, request):
        if getattr(request.user, "student_profile", None):
            return Response({"detail": "Your account is already linked to a roster row. Unlink it first."}, status=400)

        roll_number = (request.data.get("roll_number") or "").strip()
        if not roll_number:
            return Response({"roll_number": "Enter your roll number."}, status=400)

        try:
            student = Student.objects.get(roll_number__iexact=roll_number)
        except Student.DoesNotExist:
            return Response(
                {"roll_number": "No student found with that roll number. Check it, or ask transport staff to add you."},
                status=404,
            )

        if student.linked_user_id and student.linked_user_id != request.user.id:
            return Response({"roll_number": "This roll number is already linked to another account."}, status=400)

        student.linked_user = request.user
        student.save(update_fields=["linked_user"])
        return Response({"linked": True, "student": StudentSelfSerializer(student).data}, status=status.HTTP_200_OK)

    def delete(self, request):
        student = getattr(request.user, "student_profile", None)
        if student:
            student.linked_user = None
            student.save(update_fields=["linked_user"])
        return Response({"linked": False, "student": None})


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
