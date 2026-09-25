from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from accounts.permissions import CanManageBuses
from attendance.models import AttendanceFlag
from attendance.serializers import AttendanceFlagSerializer


# GET /api/attendance/flags/
# Returns all OPEN flags by default; pass ?status=ALL|REVIEWED|DISMISSED to filter.
# Staff and admins only.
@api_view(["GET"])
@permission_classes([CanManageBuses])
def flag_list(request):
    qs = AttendanceFlag.objects.select_related("session", "reviewed_by").prefetch_related("records")
    flag_status = (request.query_params.get("status") or "OPEN").upper()
    if flag_status != "ALL":
        qs = qs.filter(status=flag_status)
    return Response(AttendanceFlagSerializer(qs[:200], many=True).data)


# PATCH /api/attendance/flags/<id>/review/
# Mark a flag as REVIEWED or DISMISSED with an optional note.
@api_view(["PATCH"])
@permission_classes([CanManageBuses])
def flag_review(request, flag_id):
    try:
        flag = AttendanceFlag.objects.get(pk=flag_id)
    except AttendanceFlag.DoesNotExist:
        return Response({"detail": "Flag not found."}, status=status.HTTP_404_NOT_FOUND)

    new_status = (request.data.get("status") or "").upper()
    if new_status not in ("REVIEWED", "DISMISSED"):
        return Response(
            {"detail": "status must be REVIEWED or DISMISSED."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    note = (request.data.get("review_note") or "").strip()
    flag.status = new_status
    flag.reviewed_by = request.user
    flag.reviewed_at = timezone.now()
    flag.review_note = note
    flag.save(update_fields=["status", "reviewed_by", "reviewed_at", "review_note"])
    return Response(AttendanceFlagSerializer(flag).data)
