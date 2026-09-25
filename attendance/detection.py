"""
attendance/detection.py  -  Step 6 cheat-detection (plan items 2A.5, 2A.6)

Call run_detection(session) after any attendance change to check that session
for suspicious patterns and create AttendanceFlag rows for new findings.
Each rule is idempotent: it will not create a duplicate flag for a rule that
is already OPEN on the same session.
"""
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from attendance.models import AttendanceAudit, AttendanceFlag, AttendanceRecord


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _already_flagged(session, rule):
    return AttendanceFlag.objects.filter(
        session=session, rule=rule, status='OPEN'
    ).exists()


def _create_flag(session, rule, severity, detail, records=None):
    if _already_flagged(session, rule):
        return None
    flag = AttendanceFlag.objects.create(
        session=session, rule=rule, severity=severity, detail=detail
    )
    if records:
        flag.records.set(records)
    return flag


# ---------------------------------------------------------------------------
# Rule 1 — one device used to scan many students
# ---------------------------------------------------------------------------
def _check_same_device(session):
    threshold = getattr(settings, 'FLAG_SAME_DEVICE_THRESHOLD', 3)
    from collections import defaultdict
    device_map = defaultdict(list)
    audits = (
        AttendanceAudit.objects
        .filter(session=session, action='SCAN')
        .exclude(device_id='')
        .values('device_id', 'record__student_id', 'record_id')
    )
    for row in audits:
        device_map[row['device_id']].append(row['record_id'])

    for device_id, record_ids in device_map.items():
        if len(record_ids) >= threshold:
            _create_flag(
                session=session,
                rule='SAME_DEVICE_MANY_STUDENTS',
                severity='HIGH',
                detail={'device_id': device_id, 'scan_count': len(record_ids)},
                records=AttendanceRecord.objects.filter(pk__in=record_ids),
            )


# ---------------------------------------------------------------------------
# Rule 2 — burst of scans from one IP in a short window
# ---------------------------------------------------------------------------
def _check_ip_burst(session):
    window_secs = getattr(settings, 'FLAG_IP_BURST_WINDOW_SECONDS', 30)
    threshold   = getattr(settings, 'FLAG_IP_BURST_THRESHOLD', 4)
    from collections import defaultdict
    ip_times = defaultdict(list)
    audits = (
        AttendanceAudit.objects
        .filter(session=session, action='SCAN')
        .exclude(ip_address=None)
        .values('ip_address', 'created_at', 'record_id')
        .order_by('ip_address', 'created_at')
    )
    ip_records = defaultdict(list)
    for row in audits:
        ip_times[row['ip_address']].append(row['created_at'])
        ip_records[row['ip_address']].append(row['record_id'])

    for ip, times in ip_times.items():
        for i in range(len(times)):
            window_hits = [
                t for t in times[i:]
                if (t - times[i]).total_seconds() <= window_secs
            ]
            if len(window_hits) >= threshold:
                _create_flag(
                    session=session,
                    rule='SAME_IP_BURST',
                    severity='HIGH',
                    detail={'ip': ip, 'count': len(window_hits),
                            'window_seconds': window_secs},
                    records=AttendanceRecord.objects.filter(
                        pk__in=ip_records[ip]
                    ),
                )
                break


# ---------------------------------------------------------------------------
# Rule 3 — unusually high share of manual marks
# ---------------------------------------------------------------------------
def _check_manual_share(session):
    threshold = getattr(settings, 'FLAG_MANUAL_SHARE_RATIO', 0.4)
    total  = AttendanceRecord.objects.filter(session=session, person_type='STUDENT').count()
    manual = AttendanceRecord.objects.filter(session=session, source='MANUAL').count()
    if total and (manual / total) >= threshold:
        _create_flag(
            session=session,
            rule='MANUAL_MARK_SHARE_HIGH',
            severity='MEDIUM',
            detail={'manual': manual, 'total': total,
                    'ratio': round(manual / total, 2)},
        )


# ---------------------------------------------------------------------------
# Rule 4 — everyone marked present within one minute
# ---------------------------------------------------------------------------
def _check_instant_present(session):
    threshold = getattr(settings, 'FLAG_INSTANT_PRESENT_SECONDS', 60)
    records = list(
        AttendanceRecord.objects
        .filter(session=session, status='PRESENT', person_type='STUDENT')
        .exclude(marked_at=None)
        .values('pk', 'marked_at')
    )
    if len(records) < 3:
        return
    times = sorted(r['marked_at'] for r in records)
    span = (times[-1] - times[0]).total_seconds()
    if span <= threshold:
        _create_flag(
            session=session,
            rule='SESSION_INSTANT_PRESENT',
            severity='HIGH',
            detail={'present_count': len(records), 'span_seconds': round(span, 1)},
            records=AttendanceRecord.objects.filter(pk__in=[r['pk'] for r in records]),
        )


# ---------------------------------------------------------------------------
# Rule 5 — attendance recorded on a declared holiday
# ---------------------------------------------------------------------------
def _check_holiday_attendance(session):
    if not session.is_holiday:
        return
    present = AttendanceRecord.objects.filter(session=session, status='PRESENT')
    if present.exists():
        _create_flag(
            session=session,
            rule='HOLIDAY_ATTENDANCE',
            severity='HIGH',
            detail={'present_count': present.count()},
            records=present,
        )


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------
def run_detection(session):
    """
    Run all detection rules against a session. Safe to call multiple times
    (each rule is idempotent). Call this after any attendance change.
    """
    try:
        _check_same_device(session)
        _check_ip_burst(session)
        _check_manual_share(session)
        _check_instant_present(session)
        _check_holiday_attendance(session)
    except Exception:
        # Detection must never crash the calling view.
        import logging
        logging.getLogger(__name__).exception(
            'Detection error for session %s', session.pk
        )
