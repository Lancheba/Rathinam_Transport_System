from datetime import date as date_cls

from rest_framework import permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from accounts.permissions import CanManageBuses, is_incharge
from students.models import Student

from .models import TemporaryInchargeAssignment


def _real_incharge_bus(user):
    """
    The bus this user is the PERMANENT in-charge of (ignores any stand-in
    delegation on either side). Only the real in-charge -- not a stand-in --
    or an admin/staff, may create/end a delegation.
    """
    return getattr(user, "incharge_bus", None)


# ---------------------------------------------------------------------------
# GET/POST/DELETE /api/attendance/incharge/delegate/
#   GET    -> today's stand-in status for the bus (or null).
#   POST   -> {"student_id": ...} hands off today's in-charge powers to a
#             student on the same bus. Only the real in-charge, or admin/
#             staff (who must supply ?bus=<id>), may call this.
#   DELETE -> ends today's delegation early.
# ---------------------------------------------------------------------------
@api_view(["GET", "POST", "DELETE"])
@permission_classes([permissions.IsAuthenticated])
def incharge_delegate(request):
    bus = _real_incharge_bus(request.user)
    is_staff_admin = CanManageBuses().has_permission(request, None)

    if not bus and is_staff_admin:
        bus_id = request.query_params.get("bus") or request.data.get("bus")
        if not bus_id:
            return Response({"detail": "Provide ?bus=<id>."}, status=400)
        from buses.models import Bus
        try:
            bus = Bus.objects.get(pk=bus_id)
        except (Bus.DoesNotExist, ValueError, TypeError):
            return Response({"detail": "Bus not found."}, status=404)

    if not bus:
        return Response(
            {"detail": "Only the cab's in-charge (or an admin/staff, with ?bus=<id>) can do this."},
            status=403,
        )

    today = date_cls.today()

    if request.method == "GET":
        assignment = (
            TemporaryInchargeAssignment.objects
            .filter(bus=bus, date=today, is_active=True)
            .select_related("stand_in__student_profile")
            .first()
        )
        if not assignment:
            return Response({"active": False})
        student = getattr(assignment.stand_in, "student_profile", None)
        return Response({
            "active": True,
            "student_id": student.id if student else None,
            "name": student.name if student else assignment.stand_in.username,
            "roll_number": student.roll_number if student else None,
            "date": str(assignment.date),
        })

    if request.method == "DELETE":
        updated = TemporaryInchargeAssignment.objects.filter(
            bus=bus, date=today, is_active=True,
        ).update(is_active=False)
        if not updated:
            return Response({"detail": "No active stand-in for today."}, status=404)
        return Response({"detail": "Stand-in delegation ended."})

    # POST
    student_id = request.data.get("student_id")
    if not student_id:
        return Response({"detail": "student_id is required."}, status=400)
    try:
        student = Student.objects.select_related("linked_user").get(pk=student_id, bus=bus)
    except Student.DoesNotExist:
        return Response({"detail": "That student is not on this bus's roster."}, status=404)
    if not student.linked_user:
        return Response(
            {"detail": "That student doesn't have a linked login yet, so they can't be a stand-in."},
            status=400,
        )
    if is_incharge(student.linked_user):
        return Response(
            {"detail": "A stand-in cannot already be (or already be standing in as) an in-charge."},
            status=400,
        )

    existing = TemporaryInchargeAssignment.objects.filter(bus=bus, date=today).order_by("-created_at").first()
    if existing:
        existing.stand_in = student.linked_user
        existing.assigned_by = request.user
        existing.is_active = True
        existing.save(update_fields=["stand_in", "assigned_by", "is_active"])
        assignment = existing
    else:
        assignment = TemporaryInchargeAssignment.objects.create(
            bus=bus, date=today, stand_in=student.linked_user,
            assigned_by=request.user, is_active=True,
        )

    return Response({
        "active": True, "student_id": student.id, "name": student.name,
        "roll_number": student.roll_number, "date": str(assignment.date),
    }, status=201)
