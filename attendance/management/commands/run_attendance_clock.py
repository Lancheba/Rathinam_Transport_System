import time

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = (
        "Long-running 'clock' process: every day it fires "
        "`finalize_attendance --slot=MORNING` at 09:31 and "
        "`finalize_attendance --slot=EVENING` at 19:31 (Asia/Kolkata). "
        "Railway doesn't run cron jobs inside a normal web service, so this "
        "is meant to run as its own always-on process (see Procfile's "
        "`clock` entry) — or, alternatively, replace it with a Railway Cron "
        "Job that runs `python manage.py finalize_attendance --slot=...` "
        "directly on a schedule, if you'd rather not keep a process alive."
    )

    # (slot, hour, minute) — 24h, Asia/Kolkata.
    CHECKS = [
        ("MORNING", 9, 31),
        ("EVENING", 19, 31),
    ]

    def handle(self, *args, **options):
        last_run = {}  # slot -> date.date() it last fired on, so we never double-fire
        self.stdout.write(self.style.SUCCESS(
            "Attendance clock started. Watching for 09:31 / 19:31 Asia/Kolkata daily."
        ))
        while True:
            now = timezone.localtime(timezone.now())
            today = now.date()

            for slot, hour, minute in self.CHECKS:
                if now.hour == hour and now.minute == minute and last_run.get(slot) != today:
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
