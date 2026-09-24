from datetime import datetime, timedelta

from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from attendance.models import AttendanceAudit
from attendance.models import (
    AttendanceRecord, AttendanceSession, AttendanceWindowConfig, Holiday, Teacher,
)
from buses.models import Bus
from students.models import Student


def is_school_day(day):
    """True if attendance should be taken on this date: a working weekday and not a declared Holiday."""
    start = getattr(settings, "ATTENDANCE_START_DATE", None)
    if start and day < start:
        return False
    weekdays = getattr(settings, "ATTENDANCE_WORKING_WEEKDAYS", (0, 1, 2, 3, 4, 5))
    if day.weekday() not in weekdays:
        return False
    return not Holiday.objects.filter(date=day).exists()


def get_windows():
    """
    The ONE place the MORNING/EVENING windows come from: the admin-editable
    AttendanceWindowConfig (Settings page). Returns
    {"MORNING": (start, end), "EVENING": (start, end)} as datetime.time values.
    """
    cfg = AttendanceWindowConfig.get_solo()
    return {
        "MORNING": (cfg.morning_start, cfg.morning_end),
        "EVENING": (cfg.evening_start, cfg.evening_end),
    }


def _active_bus_ids():
    """Ids of active buses that have at least one student or teacher."""
    ids = set(Student.objects.filter(bus__isnull=False).values_list("bus_id", flat=True))
    ids |= set(Teacher.objects.filter(bus__isnull=False).values_list("bus_id", flat=True))
    return set(Bus.objects.filter(pk__in=ids, is_active=True).values_list("pk", flat=True))


@transaction.atomic
def finalize_session(session):
    """
    Mark every student AND teacher on the bus who has no record yet as ABSENT
    (source=AUTO_ABSENT), then close the session.

    Safe to call twice, or from two processes at once: the session row is
    locked with select_for_update, an already-finalized session is left alone,
    and bulk_create ignores conflicts. Holiday sessions are never touched.
    Returns the number of ABSENT rows created.
    """
    locked = AttendanceSession.objects.select_for_update().get(pk=session.pk)
    if locked.is_holiday or locked.auto_finalized:
        session.closed_at = locked.closed_at
        session.auto_finalized = locked.auto_finalized
        return 0

    now = timezone.now()
    marked_students = set(
        locked.records.filter(student__isnull=False).values_list("student_id", flat=True)
    )
    marked_teachers = set(
        locked.records.filter(teacher__isnull=False).values_list("teacher_id", flat=True)
    )

    new_rows = []
    for s in Student.objects.filter(bus=locked.bus):
        if s.pk not in marked_students:
            new_rows.append(AttendanceRecord(
                session=locked, person_type="STUDENT", student=s,
                status="ABSENT", source="AUTO_ABSENT", marked_at=now,
            ))
    for t in Teacher.objects.filter(bus=locked.bus):
        if t.pk not in marked_teachers:
            new_rows.append(AttendanceRecord(
                session=locked, person_type="TEACHER", teacher=t,
                status="ABSENT", source="AUTO_ABSENT", marked_at=now,
            ))
    AttendanceRecord.objects.bulk_create(new_rows, ignore_conflicts=True)

    locked.closed_at = now
    locked.auto_finalized = True
    locked.save(update_fields=["closed_at", "auto_finalized"])

    # keep the caller's object in sync
    session.closed_at = locked.closed_at
    session.auto_finalized = True
    return len(new_rows)


def finalize_slot(day, slot):
    """
    Close out one slot for one date across ALL active buses that have people,
    whether or not an in-charge ever opened a QR session.
    Missing sessions are created. Non-school days do nothing.
    Idempotent: running it again changes nothing.
    """
    result = {
        "date": day, "slot": slot, "skipped": None,
        "sessions_created": 0, "sessions_finalized": 0, "absent_created": 0,
    }
    if not is_school_day(day):
        result["skipped"] = "not a school day (weekend or holiday)"
        return result

    for bus in Bus.objects.filter(pk__in=_active_bus_ids()).order_by("pk"):
        session, created = AttendanceSession.objects.get_or_create(bus=bus, date=day, slot=slot)
        if created:
            result["sessions_created"] += 1
        if session.is_holiday or session.auto_finalized:
            continue
        result["absent_created"] += finalize_session(session)
        result["sessions_finalized"] += 1
    return result


def slot_is_pending(day, slot):
    """True if finalize_slot(day, slot) still has work to do (used by the clock)."""
    if not is_school_day(day):
        return False
    done = set(
        AttendanceSession.objects
        .filter(date=day, slot=slot)
        .filter(Q(auto_finalized=True) | Q(is_holiday=True))
        .values_list("bus_id", flat=True)
    )
    return bool(_active_bus_ids() - done)


def run_due_finalizations(now=None):
    """
    One clock tick. Finalizes every slot whose window ended at least a minute
    ago and which still has work to do, for today AND the previous
    ATTENDANCE_CATCHUP_DAYS days (default 3). Because it looks at what is
    pending instead of matching an exact minute, a clock that was down for an
    hour (or a night) simply catches up on its next tick.
    Returns the list of finalize_slot() results for slots it actually worked on.
    """
    now = timezone.localtime(now or timezone.now())
    today = now.date()
    catchup = getattr(settings, "ATTENDANCE_CATCHUP_DAYS", 3)
    ends = tuple((slot, end) for slot, (_start, end) in get_windows().items())

    results = []
    for offset in range(catchup, -1, -1):
        day = today - timedelta(days=offset)
        for slot, end_t in ends:
            due_at = timezone.make_aware(datetime.combine(day, end_t)) + timedelta(minutes=1)
            if now >= due_at and slot_is_pending(day, slot):
                results.append(finalize_slot(day, slot))
    return results


def set_attendance(*, session, person_type, status, action, student=None, teacher=None,
                    actor=None, reason='', source='', ip_address=None,
                    face_match_score=None, remarks=None):
    """
    THE ONLY function allowed to create or update an AttendanceRecord.
    Locks the existing row (select_for_update) if one exists, applies the
    change in one transaction, and always writes exactly one AttendanceAudit
    row alongside it. Returns the saved AttendanceRecord.
    """
    if person_type == 'STUDENT' and student is None:
        raise ValueError('student is required when person_type is STUDENT')
    if person_type == 'TEACHER' and teacher is None:
        raise ValueError('teacher is required when person_type is TEACHER')

    lookup = {
        'session': session,
        'student': student if person_type == 'STUDENT' else None,
        'teacher': teacher if person_type == 'TEACHER' else None,
    }

    with transaction.atomic():
        existing = AttendanceRecord.objects.select_for_update().filter(**lookup).first()
        old_status = existing.status if existing else ''

        defaults = {'status': status, 'person_type': person_type}
        if source:
            defaults['source'] = source
        if remarks is not None:
            defaults['remarks'] = remarks
        if face_match_score is not None:
            defaults['face_match_score'] = face_match_score
        if status == 'PRESENT':
            defaults['marked_at'] = timezone.now()
        if action in ('CORRECT', 'MANUAL'):
            defaults['is_correction'] = True
            defaults['corrected_by'] = actor
            defaults['corrected_at'] = timezone.now()
        if action == 'CORRECT':
            defaults['locked_at'] = timezone.now()

        record, _created = AttendanceRecord.objects.update_or_create(
            defaults=defaults, **lookup
        )

        AttendanceAudit.objects.create(
            record=record,
            action=action,
            old_status=old_status,
            new_status=status,
            actor=actor,
            reason=reason,
            source=source or record.source,
            ip_address=ip_address,
        )

    return record
