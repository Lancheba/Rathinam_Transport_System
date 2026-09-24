from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django.utils.dateparse import parse_date

from attendance.services import finalize_slot


class Command(BaseCommand):
    help = (
        "Closes an attendance slot for ALL active buses: creates any missing "
        "sessions, marks everyone (students and teachers) without a record as "
        "ABSENT (source=AUTO_ABSENT) and sets auto_finalized=True. Does nothing "
        "on weekends or declared holidays. Safe to run more than once. "
        "Use --date to catch up a day that was missed."
    )

    def add_arguments(self, parser):
        parser.add_argument("--slot", choices=["MORNING", "EVENING"], required=True)
        parser.add_argument("--date", help="YYYY-MM-DD (defaults to today).")

    def handle(self, *args, **options):
        slot = options["slot"]
        today = timezone.localdate()
        day = today
        if options.get("date"):
            try:
                day = parse_date(options["date"])
            except ValueError:
                day = None
            if day is None:
                raise CommandError("--date must be a real date in YYYY-MM-DD format.")
            if day > today:
                raise CommandError("--date cannot be in the future.")

        r = finalize_slot(day, slot)
        if r["skipped"]:
            self.stdout.write(self.style.WARNING(f"{day} {slot}: skipped - {r['skipped']}."))
            return
        self.stdout.write(self.style.SUCCESS(
            f"{day} {slot}: {r['sessions_created']} session(s) created, "
            f"{r['sessions_finalized']} finalized, {r['absent_created']} auto-absent record(s)."
        ))
