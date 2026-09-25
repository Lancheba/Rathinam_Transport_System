from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from accounts.permissions import IsFullAdmin
from attendance.models import AttendanceRecord
from attendance.net import client_ip
from attendance.serializers import AttendanceRecordSerializer
from attendance.services import set_attendance


# PATCH /api/attendance/records/<id>/revoke/   (administrators only)
# Present -> Absent with a written reason. The rules live in check_rules().
@api_view(["PATCH"])
@permission_classes([IsFullAdmin])
def attendance_revoke(request, record_id):
    try:
        record = AttendanceRecord.objects.select_related("session").get(pk=record_id)
    except AttendanceRecord.DoesNotExist:
        return Response({"detail": "Attendance record not found."}, status=status.HTTP_404_NOT_FOUND)

    reason = (request.data.get("reason") or "").strip()
    if not 10 <= len(reason) <= 200:
        return Response(
            {"detail": "reason is required and must be between 10 and 200 characters."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    record = set_attendance(
        session=record.session,
        person_type=record.person_type,
        student=record.student,
        teacher=record.teacher,
        status="ABSENT",
        action="REVOKE",
        remarks=reason,
        reason=reason,
        actor=request.user,
        ip_address=client_ip(request),
    )
    return Response(AttendanceRecordSerializer(record).data, status=status.HTTP_200_OK)