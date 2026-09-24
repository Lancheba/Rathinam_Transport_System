import time

from django.core.management.base import BaseCommand
from django.db import close_old_connections

from attendance.services import run_due_finalizations


class Command(BaseCommand):
    help = (
        "Attendance clock. Each pass finalizes every slot whose window has "
        "ended and is not finalized yet (today plus the last few days), so a "
        "restart after downtime catches up automatically. "
        "Default: loop forever (Procfile 'clock' process). "
        "With --once: run a single pass and exit - use this from a Railway "
        "Cron Job or any scheduler, e.g. every 5 minutes."
    )

    def add_arguments(self, parser):
        parser.add_argument("--once", action="store_true",
                            help="Run one pass and exit (for cron-style schedulers).")
        parser.add_argument("--interval", type=int, default=30,
                            help="Seconds between passes when looping (default 30, minimum 5).")

    def _tick(self):
        for r in run_due_finalizations():
            self.stdout.write(
                f"{r['date']} {r['slot']}: {r['sessions_created']} session(s) created, "
                f"{r['sessions_finalized']} finalized, {r['absent_created']} auto-absent."
            )

    def handle(self, *args, **options):
        if options["once"]:
            self._tick()
            return

        interval = max(options["interval"], 5)
        self.stdout.write(self.style.SUCCESS(
            f"Attendance clock started (checking every {interval}s, with catch-up)."
        ))
        while True:
            try:
                close_old_connections()
                self._tick()
            except Exception as exc:
                # A bad pass must never kill the clock process.
                self.stderr.write(self.style.ERROR(f"clock pass failed: {exc}"))
            time.sleep(interval)
