import math
import secrets
import base64
import io
from datetime import timedelta

import qrcode
import json
from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response

from attendance.models import AttendanceQRToken, AttendanceRecord, AttendanceSession
from attendance.permissions import IsDriver, driver_bus
from accounts.permissions import CanManageBuses
from students.models import FaceProfile
from config.throttles import FaceScanThrottle
from accounts.permissions import IsStudent


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _current_slot():
    """Return 'MORNING', 'EVENING', or None based on Asia/Kolkata time."""
    now = timezone.localtime(timezone.now())
    t = now.time()
    import datetime
    m_start = datetime.time(5, 0)
    m_end   = datetime.time(9, 30)
    e_start = datetime.time(16, 30)
    e_end   = datetime.time(19, 30)
    if m_start <= t <= m_end:
        return 'MORNING'
    if e_start <= t <= e_end:
        return 'EVENING'
    return None


def _slot_window_end(slot):
    """Return today's window-end as an aware datetime."""
    import datetime
    now = timezone.localtime(timezone.now())
    if slot == 'MORNING':
        end_t = datetime.time(9, 30)
    else:
        end_t = datetime.time(19, 30)
    return timezone.make_aware(
        timezone.datetime.combine(now.date(), end_t),
        timezone.get_current_timezone(),
    )


def _cosine_distance(a, b):
    """Cosine distance in [0, 1] — 0 means identical vectors."""
    dot = sum(x * y for x, y in zip(a, b))
    na  = math.sqrt(sum(x * x for x in a))
    nb  = math.sqrt(sum(x * x for x in b))
    if na == 0 or nb == 0:
        return 1.0
    return 1.0 - dot / (na * nb)


# ---------------------------------------------------------------------------
# POST /api/attendance/qr/generate/   (temporarily admin/staff only - Phase 1
# removed driver access; Phase 7 will hand this to the Cab In-Charge role)
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([CanManageBuses])
def qr_generate(request):
    slot = _current_slot()
    if not slot:
        return Response(
            {'detail': 'No attendance window is open right now.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    bus = driver_bus(request.user)
    if not bus:
        return Response(
            {'detail': 'No bus is assigned to you.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    today = timezone.localdate()
    session, _ = AttendanceSession.objects.get_or_create(
        bus=bus, date=today, slot=slot,
        defaults={'marked_by': request.user},
    )
    if not session.opened_at:
        session.opened_at = timezone.now()
        session.save(update_fields=['opened_at'])

    ttl = getattr(settings, 'QR_TOKEN_TTL_SECONDS', 60)
    token_str = secrets.token_urlsafe(32)
    qr_token = AttendanceQRToken.objects.create(
        bus=bus,
        date=today,
        slot=slot,
        token=token_str,
        issued_by=request.user,
        expires_at=timezone.now() + timedelta(seconds=ttl),
    )

    payload = json.dumps({
        'token': token_str,
        'bus_id': bus.pk,
        'slot': slot,
        'date': str(today),
    })
    img = qrcode.make(payload)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    qr_b64 = base64.b64encode(buf.getvalue()).decode()

    present = session.records.filter(status='PRESENT').count()
    total   = session.records.count()

    return Response({
        'qr_image_base64': qr_b64,
        'token': token_str,
        'expires_at': qr_token.expires_at,
        'session_id': session.pk,
        'slot': slot,
        'present_count': present,
        'total_count': total,
    })


# ---------------------------------------------------------------------------
# GET /api/attendance/qr/tally/   (temporarily admin/staff only - Phase 1
# removed driver access; Phase 7 will hand this to the Cab In-Charge role)
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([CanManageBuses])
def qr_tally(request):
    slot = _current_slot()
    if not slot:
        return Response(
            {'detail': 'No attendance window is open right now.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    bus = driver_bus(request.user)
    if not bus:
        return Response(
            {'detail': 'No bus is assigned to you.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    today = timezone.localdate()
    session = AttendanceSession.objects.filter(bus=bus, date=today, slot=slot).first()
    present = session.records.filter(status='PRESENT').count() if session else 0
    total = session.records.count() if session else 0

    return Response({
        'slot': slot,
        'session_id': session.pk if session else None,
        'present_count': present,
        'total_count': total,
    })


# ---------------------------------------------------------------------------
# POST /api/attendance/qr/scan/   (student only)
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([IsStudent])
@throttle_classes([FaceScanThrottle])
def qr_scan(request):
    student = getattr(request.user, 'student_profile', None)
    if not student:
        return Response(
            {'detail': 'Link your student roll number first.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    token_str  = request.data.get('token')
    embedding  = request.data.get('embedding')
    if not token_str or not embedding:
        return Response(
            {'detail': 'token and embedding are required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        qr_token = AttendanceQRToken.objects.get(token=token_str)
    except AttendanceQRToken.DoesNotExist:
        return Response(
            {'detail': 'QR code is invalid or has expired.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if timezone.now() > qr_token.expires_at:
        return Response(
            {'detail': 'QR code is invalid or has expired.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if qr_token.bus_id != student.bus_id:
        return Response(
            {'detail': "This QR isn't for your bus."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        session = AttendanceSession.objects.get(
            bus_id=qr_token.bus_id,
            date=qr_token.date,
            slot=qr_token.slot,
        )
    except AttendanceSession.DoesNotExist:
        return Response(
            {'detail': 'Attendance session not found.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if session.auto_finalized or timezone.now() > _slot_window_end(session.slot):
        return Response(
            {'detail': 'Attendance for this session is already closed.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        face_profile = student.face_profile
    except FaceProfile.DoesNotExist:
        return Response(
            {'detail': 'Face not enrolled yet.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not face_profile.embedding:
        return Response({'detail': 'Face not enrolled yet.'}, status=status.HTTP_400_BAD_REQUEST)

    threshold = getattr(settings, 'FACE_MATCH_THRESHOLD', 0.6)
    distance  = _cosine_distance(embedding, face_profile.embedding)

    if distance > threshold:
        return Response(
            {
                'detail': 'Face did not match. Try again with better lighting, or ask your driver to mark you manually.',
                'score': distance,
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    record, _ = AttendanceRecord.objects.update_or_create(
        session=session,
        student=student,
        defaults={
            'status': 'PRESENT',
            'person_type': 'STUDENT',
            'source': 'QR_FACE',
            'marked_at': timezone.now(),
            'face_match_score': distance,
        },
    )

    return Response({
        'status': 'PRESENT',
        'session_id': session.pk,
        'slot': session.slot,
        'marked_at': record.marked_at,
    })


