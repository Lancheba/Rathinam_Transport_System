from .net import client_ip
import logging
import math
import numpy as np
import secrets
import base64
import io
from datetime import timedelta

import qrcode
import json
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response

from attendance.models import AttendanceQRToken, AttendanceRecord, AttendanceSession, AttendanceWindowConfig
from attendance.permissions import IsInCharge, incharge_bus
from attendance.services import get_windows, is_school_day, set_attendance
from students.models import FaceProfile, Student
from config.throttles import FaceScanThrottle
from accounts.permissions import IsStudent
from students.face_utils import clean_embedding

logger = logging.getLogger(__name__)


def _current_slot():
    """
    Return 'MORNING', 'EVENING', or None based on Asia/Kolkata time, using the
    start/end times admins and staff have configured (AttendanceWindowConfig),
    instead of fixed hours.
    """
    t = timezone.localtime(timezone.now()).time()
    for slot, (start, end) in get_windows().items():
        if start <= t <= end:
            return slot
    return None


def _slot_window_end(slot):
    """Return today's configured window-end as an aware datetime."""
    now = timezone.localtime(timezone.now())
    end_t = get_windows()[slot][1]
    return timezone.make_aware(
        timezone.datetime.combine(now.date(), end_t),
        timezone.get_current_timezone(),
    )


def _tally(bus, session):
    """
    (present, total) for the QR screen. Students only, and the total is the
    bus ROSTER, so it matches the Students page instead of counting only the
    records created so far.
    """
    total = Student.objects.filter(bus=bus).count()
    if not session:
        return 0, total
    present = session.records.filter(status='PRESENT', student__isnull=False).count()
    return present, total


def _face_distance(a, b):
    """Euclidean distance between two embeddings - 0 means identical vectors."""
    return float(np.linalg.norm(np.asarray(a, dtype=float) - np.asarray(b, dtype=float)))


# POST /api/attendance/qr/generate/   (Cab In-Charge only)

@api_view(['POST'])
@permission_classes([IsInCharge])
def qr_generate(request):
    slot = _current_slot()
    if not slot:
        return Response(
            {'detail': 'No attendance window is open right now.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    bus = incharge_bus(request.user)
    if not bus:
        return Response(
            {'detail': 'No bus is assigned to you.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    today = timezone.localdate()
    if not is_school_day(today):
        return Response(
            {'detail': 'Attendance is not taken today (weekend or holiday).'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    session, _created = AttendanceSession.objects.get_or_create(
        bus=bus, date=today, slot=slot,
        defaults={'marked_by': request.user},
    )

    changed_fields = []
    if not session.opened_at:
        session.opened_at = timezone.now()
        changed_fields.append('opened_at')
    if session.closed_at or session.auto_finalized:
        session.closed_at = None
        session.auto_finalized = False
        changed_fields += ['closed_at', 'auto_finalized']
    if changed_fields:
        session.save(update_fields=changed_fields)

    ttl = getattr(settings, 'QR_TOKEN_TTL_SECONDS', 60)

    # 2.8: a session should only ever have one live token; refreshing
    # (or re-opening) must not leave older tokens scannable.
    AttendanceQRToken.objects.filter(
        bus=bus, date=today, slot=slot, expires_at__gt=timezone.now(),
    ).delete()

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

    present, total = _tally(bus, session)

    return Response({
        'qr_image_base64': qr_b64,
        'token': token_str,
        'expires_at': qr_token.expires_at,
        'session_id': session.pk,
        'slot': slot,
        'present_count': present,
        'total_count': total,
    })


# GET /api/attendance/qr/tally/   (Cab In-Charge only)

@api_view(['GET'])
@permission_classes([IsInCharge])
def qr_tally(request):
    slot = _current_slot()
    if not slot:
        return Response(
            {'detail': 'No attendance window is open right now.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    bus = incharge_bus(request.user)
    if not bus:
        return Response(
            {'detail': 'No bus is assigned to you.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    today = timezone.localdate()
    session = AttendanceSession.objects.filter(bus=bus, date=today, slot=slot).first()
    present, total = _tally(bus, session)

    return Response({
        'slot': slot,
        'session_id': session.pk if session else None,
        'present_count': present,
        'total_count': total,
    })


# POST /api/attendance/qr/stop/   (Cab In-Charge only) - actually closes the
# session server-side, instead of just hiding the QR on screen.

@api_view(['POST'])
@permission_classes([IsInCharge])
def qr_stop(request):
    bus = incharge_bus(request.user)
    if not bus:
        return Response(
            {'detail': 'No bus is assigned to you.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    today = timezone.localdate()
    session = (
        AttendanceSession.objects
        .filter(bus=bus, date=today, opened_at__isnull=False, closed_at__isnull=True)
        .order_by('-id')
        .first()
    )
    if not session:
        return Response(
            {'detail': 'No open attendance session to stop.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    from attendance.services import finalize_session
    finalize_session(session)

    present, total = _tally(bus, session)

    return Response({
        'session_id': session.pk,
        'slot': session.slot,
        'present_count': present,
        'total_count': total,
        'closed_at': session.closed_at,
    })


# GET /api/attendance/qr/status/   (student only) - polled by the student's
# own page to auto-show "Attendance is open" / "Closed".

@api_view(['GET'])
@permission_classes([IsStudent])
def qr_status(request):
    student = getattr(request.user, 'student_profile', None)
    if not student or not student.bus_id:
        return Response({'open': False, 'slot': None})

    slot = _current_slot()
    if not slot:
        return Response({'open': False, 'slot': None})

    session = AttendanceSession.objects.filter(
        bus_id=student.bus_id, date=timezone.localdate(), slot=slot,
    ).first()

    if not session or not session.opened_at or session.closed_at or session.auto_finalized:
        return Response({'open': False, 'slot': slot})

    already_marked = session.records.filter(student=student, status='PRESENT').exists()

    return Response({
        'open': True,
        'slot': slot,
        'session_id': session.pk,
        'already_marked': already_marked,
    })


# POST /api/attendance/qr/scan/   (student only)

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
        embedding = clean_embedding(embedding)
    except ValueError:
        return Response(
            {'detail': 'A valid 128-value embedding array is required.'},
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

    if session.is_holiday or not is_school_day(session.date):
        return Response(
            {'detail': 'Attendance is not taken today (holiday or non-school day).'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if session.auto_finalized or timezone.now() > _slot_window_end(session.slot):
        return Response(
            {'detail': 'Attendance for this session is already closed.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    lockout_key = f'face_scan_fail_{student.pk}_{session.pk}'
    max_attempts = getattr(settings, 'FACE_SCAN_MAX_ATTEMPTS_PER_SESSION', 5)
    if cache.get(lockout_key, 0) >= max_attempts:
        logger.warning('Face scan locked out for student %s session %s', student.pk, session.pk)
        return Response(
            {'detail': 'Too many failed face scans for this session. Ask your cab in-charge to mark you manually.'},
            status=status.HTTP_403_FORBIDDEN,
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
    try:
        stored = clean_embedding(face_profile.embedding)
    except ValueError:
        return Response(
            {'detail': 'Your saved face data is invalid. Please re-enroll your face.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    distance = _face_distance(embedding, stored)

    # A NaN or infinite distance must never count as a match (NaN > threshold is False).
    # The score is logged server-side only: returning it lets an attacker tune a fake vector.
    if not math.isfinite(distance) or distance > threshold:
        logger.warning('Face scan rejected for student %s (distance=%s)', student.pk, distance)
        window_end = _slot_window_end(session.slot)
        ttl = max(int((window_end - timezone.now()).total_seconds()), 60)
        try:
            cache.incr(lockout_key)
        except ValueError:
            cache.set(lockout_key, 1, timeout=ttl)
        return Response(
            {'detail': 'Face did not match. Try again with better lighting, or ask your cab in-charge to mark you manually.'},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    ip = client_ip(request) or ''
    record = set_attendance(
        session=session,
        person_type='STUDENT',
        student=student,
        status='PRESENT',
        action='SCAN',
        source='QR_FACE',
        face_match_score=distance,
        ip_address=ip.split(',')[0].strip() or None,
    )

    return Response({
        'status': 'PRESENT',
        'session_id': session.pk,
        'slot': session.slot,
        'marked_at': record.marked_at,
    })


# POST /api/attendance/qr/manual/   (Cab In-Charge only)
# Lets the in-charge mark a student PRESENT manually when face scan fails.
# Requires: student_id (int), remark (str, min 10 chars).
# Only works while the session is open (not auto_finalized).
@api_view(['POST'])
@permission_classes([IsInCharge])
def qr_manual_mark(request):
    bus = incharge_bus(request.user)
    if not bus:
        return Response(
            {'detail': 'No bus is assigned to you.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    student_id = request.data.get('student_id')
    remark = (request.data.get('remark') or '').strip()

    if not student_id:
        return Response(
            {'detail': 'student_id is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not 10 <= len(remark) <= 200:
        return Response(
            {'detail': 'remark must be between 10 and 200 characters.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    from students.models import Student
    try:
        student = Student.objects.get(pk=student_id, bus=bus)
    except Student.DoesNotExist:
        return Response(
            {'detail': 'Student not found on your bus.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    today = timezone.localdate()
    if not is_school_day(today):
        return Response(
            {'detail': 'Attendance is not taken today (weekend or holiday).'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    session = (
        AttendanceSession.objects
        .filter(bus=bus, date=today, opened_at__isnull=False,
                closed_at__isnull=True, auto_finalized=False, is_holiday=False)
        .order_by('-id')
        .first()
    )
    if not session:
        return Response(
            {'detail': 'No open attendance session. Start a QR session first.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    existing = AttendanceRecord.objects.filter(session=session, student=student).first()
    if existing and existing.status == 'PRESENT':
        return Response(
            {'detail': 'Student is already marked PRESENT.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    ip = client_ip(request) or ''
    record = set_attendance(
        session=session,
        person_type='STUDENT',
        student=student,
        status='PRESENT',
        action='MANUAL',
        source='MANUAL',
        remarks=remark,
        actor=request.user,
        reason=remark,
        ip_address=ip.split(',')[0].strip() or None,
    )

    return Response({
        'status': 'PRESENT',
        'source': 'MANUAL',
        'session_id': session.pk,
        'student_id': student.pk,
        'remark': remark,
        'marked_at': record.marked_at,
    }, status=status.HTTP_200_OK)


# GET /api/attendance/qr/window/   (Cab In-Charge only)
# Tells the UI which slot is open right now, using the SERVER clock and the
# configured windows, so the frontend never hardcodes hours.

@api_view(['GET'])
@permission_classes([IsInCharge])
def qr_window(request):
    today = timezone.localdate()
    school_day = is_school_day(today)
    w = get_windows()
    fmt = lambda t: t.strftime('%H:%M')
    return Response({
        'slot': _current_slot() if school_day else None,
        'school_day': school_day,
        'morning': [fmt(t) for t in w['MORNING']],
        'evening': [fmt(t) for t in w['EVENING']],
    })
