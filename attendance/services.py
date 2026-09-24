from django.db import transaction
from django.utils import timezone

from attendance.models import AttendanceRecord, AttendanceSession
from students.models import Student


@transaction.atomic
def finalize_session(session):
    """
    Mark every student on the bus who has no PRESENT record as ABSENT
    (source=AUTO_ABSENT), then close the session.

    Idempotent: uses bulk_create with ignore_conflicts so a second call
    for the same session never duplicates rows or raises an error.
    Called from both qr_stop (manual early stop) and the
    finalize_attendance management command (automatic close-out),
    so both paths always produce ABSENT rows for non-scanners.
    """
    now = timezone.now()

    already_marked = set(
        session.records
        .filter(person_type='STUDENT')
        .values_list('student_id', flat=True)
    )

    students_on_bus = Student.objects.filter(bus=session.bus)
    to_absent = [
        AttendanceRecord(
            session=session,
            person_type='STUDENT',
            student=s,
            status='ABSENT',
            source='AUTO_ABSENT',
            marked_at=now,
        )
        for s in students_on_bus
        if s.pk not in already_marked
    ]

    AttendanceRecord.objects.bulk_create(to_absent, ignore_conflicts=True)

    session.closed_at = now
    session.auto_finalized = True
    session.save(update_fields=['closed_at', 'auto_finalized'])

    return len(to_absent)
