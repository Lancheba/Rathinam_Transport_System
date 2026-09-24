import time
from datetime import timedelta

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.utils import timezone

from attendance.models import AttendanceWindowConfig


class Command(BaseCommand):
    help = (
        "Long-running 'clock' process: every day, one minute after each "
        "slot's configured end time, it fires "
        "`finalize_attendance --slot=MORNING` / `--slot=EVENING`. "
        "The end times are read fresh from AttendanceWindowConfig on every "
        "loop, so admins/staff can change them from Settings without "
        "restarting this process. Railway doesn't run cron jobs inside a "
        "normal web service, so this is meant to run as its own always-on "
        "process (see Procfile's `clock` entry) — or, alternatively, "
        "replace it with a Railway Cron Job that runs "
        "`python manage.py finalize_attendance --slot=...` directly on a "
        "schedule, if you'd rather not keep a process alive."
    )

    def handle(self, *args, **options):
        last_run = {}  # slot -> date.date() it last fired on, so we never double-fire
        self.stdout.write(self.style.SUCCESS(
            "Attendance clock started. Watching the configured MORNING/EVENING "
            "window end times (Asia/Kolkata), refreshed every loop."
        ))
        while True:
            now = timezone.localtime(timezone.now())
            today = now.date()
            cfg = AttendanceWindowConfig.get_solo()

            checks = [
                ("MORNING", cfg.morning_end),
                ("EVENING", cfg.evening_end),
            ]

            for slot, end_t in checks:
                # Fire one minute after the configured window end.
                fire_at = (
                    timezone.datetime.combine(today, end_t) + timedelta(minutes=1)
                ).time()
                if now.hour == fire_at.hour and now.minute == fire_at.minute and last_run.get(slot) != today:
                    self.stdout.write(
                        f"[{now.isoformat()}] Firing finalize_attendance --slot={slot}"
                    )
                    try:
                        call_command("finalize_attendance", slot=slot)
                    except Exception as exc:
                        # A bad run should never kill the clock process itself.
                        self.stderr.write(self.style.ERROR(
                            f"finalize_attendance --slot={slot} failed: {exc}"
                        ))
                    last_run[slot] = today

            time.sleep(30)
