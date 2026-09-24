from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from attendance.models import AttendanceSession


class Command(BaseCommand):
    help = (
        "Closes the current attendance window: marks every student who "
        "has no record in the session as ABSENT (source=AUTO_ABSENT), "
        "then sets session.auto_finalized=True. "
        "Run one minute after each slot's configured window end time "
        "(see AttendanceWindowConfig, editable by admins/staff in Settings) "
        "— run_attendance_clock does this automatically."
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

        from attendance.services import finalize_session

        total_absent = 0
        for session in sessions:
            n = finalize_session(session)
            total_absent += n
            self.stdout.write(
                f'[{session.bus.bus_number}] {slot} finalized — '
                f'{n} auto-absent record(s) created.'
            )

        self.stdout.write(self.style.SUCCESS(
            f'Done. {total_absent} total auto-absent record(s) across all buses.'
        ))
