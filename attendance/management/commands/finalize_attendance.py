from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from attendance.models import AttendanceRecord, AttendanceSession
from students.models import Student


class Command(BaseCommand):
    help = (
        "Closes the current attendance window: marks every student who "
        "has no record in the session as ABSENT (source=AUTO_ABSENT), "
        "then sets session.auto_finalized=True. "
        "Run at 09:31 for MORNING and at 19:31 for EVENING (Asia/Kolkata)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--slot',
            choices=['MORNING', 'EVENING'],
            required=True,
            help='Which slot to finalize (MORNING or EVENING).',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        slot  = options['slot']
        today = timezone.localdate()
        now   = timezone.now()

        sessions = AttendanceSession.objects.filter(
            date=today,
            slot=slot,
            is_holiday=False,
            auto_finalized=False,
        )

        if not sessions.exists():
            self.stdout.write(self.style.WARNING(
                f'No open {slot} sessions found for {today}.'
            ))
            return

        total_absent = 0

        for session in sessions:
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

            AttendanceRecord.objects.bulk_create(to_absent)
            session.closed_at = now
            session.auto_finalized = True
            session.save(update_fields=['closed_at', 'auto_finalized'])

            total_absent += len(to_absent)
            self.stdout.write(
                f'[{session.bus.bus_number}] {slot} finalized — '
                f'{len(to_absent)} auto-absent record(s) created.'
            )

        self.stdout.write(self.style.SUCCESS(
            f'Done. {total_absent} total auto-absent record(s) across all buses.'
        ))
