import time

import logging

from django.conf import settings
from django.core.cache import cache
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.db import close_old_connections
from django.utils import timezone

from attendance.services import run_due_finalizations
from vision.linking import sweep_stale

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = (
        "System clock. Each pass finalizes every attendance slot whose "
        "window has ended (today plus the last few days, so a restart after "
        "downtime catches up automatically), verifies the audit chain once "
        "a day, and runs the vision sweep: expire stale camera tracks, flag "
        "unconfirmed slots, and flag offline cameras (plan item 4.3). "
        "Default: loop forever (Procfile 'clock' process). "
        "With --once: run a single pass and exit - use this from a Railway "
        "Cron Job or any scheduler, e.g. every 5 minutes."
    )

    def add_arguments(self, parser):
        parser.add_argument("--once", action="store_true",
                            help="Run one pass and exit (for cron-style schedulers).")
        parser.add_argument("--interval", type=int, default=30,
                            help="Seconds between passes when looping (default 30, minimum 5).")

    def _verify_chain_daily(self):
        """Once a day (after AUDIT_VERIFY_HOUR, default 02:00) re-check the audit hash chain."""
        now = timezone.localtime()
        if now.hour < getattr(settings, "AUDIT_VERIFY_HOUR", 2):
            return
        if not cache.add(f"audit-chain-verified:{now.date()}", 1, 60 * 60 * 26):
            return  # another pass or worker already did it today
        try:
            call_command("verify_audit_chain", stdout=self.stdout)
        except CommandError as exc:
            logger.error("AUDIT CHAIN CHECK FAILED: %s", exc)
            self.stderr.write(self.style.ERROR(f"AUDIT CHAIN CHECK FAILED: {exc}"))
    def _tick(self):
        self._verify_chain_daily()
        for r in run_due_finalizations():
            self.stdout.write(
                f"{r['date']} {r['slot']}: {r['sessions_created']} session(s) created, "
                f"{r['sessions_finalized']} finalized, {r['absent_created']} auto-absent."
            )
        v = sweep_stale()
        if v["went_stale"] or v["cameras_offline"] or v["pruned"]:
            self.stdout.write(
                f"vision sweep: {v['went_stale']} track(s) went stale "
                f"({v['newly_unconfirmed']} newly unconfirmed), "
                f"{v['cameras_offline']} camera(s) newly offline, {v['pruned']} old track(s) pruned."
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
