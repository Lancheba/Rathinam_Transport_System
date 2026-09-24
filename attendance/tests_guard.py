"""Step 2 guard rails: attendance is written in one place, client IPs are read in one place."""
import os
import re
from pathlib import Path

from django.conf import settings
from django.test import SimpleTestCase

SKIP_DIRS = {"venv", ".venv", "node_modules", ".git", "migrations", "frontend", "staticfiles", "__pycache__"}
TEST_FILE = re.compile(r"^tests?(_.*)?\.py$")

WRITE_CALL = re.compile(
    r"AttendanceRecord\.objects\s*\.\s*(create|get_or_create|update_or_create|bulk_create|bulk_update)\s*\("
)
CHAINED_WRITE = re.compile(r"AttendanceRecord\.objects\b[^\n]*\)\s*\.\s*(update|delete)\s*\(")
RAW_IP = re.compile(r"HTTP_X_FORWARDED_FOR|META\s*(?:\.get\(|\[)\s*[\x27\x22]REMOTE_ADDR")


# Dev-only seeders write demo history in bulk and intentionally skip the audit trail.
# Exact paths only: any other file that writes AttendanceRecord still fails this test.
SEED_COMMANDS = {
    "attendance/management/commands/seed_attendance_history.py",
    "attendance/management/commands/seed_cab_attendance.py",
}


def _python_sources():
    """Yield (relative posix path, text) for every non-test project .py file."""
    root = Path(settings.BASE_DIR)
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for name in filenames:
            if name.endswith(".py") and not TEST_FILE.match(name):
                path = Path(dirpath) / name
                text = path.read_text(encoding="utf-8-sig", errors="replace")
                yield path.relative_to(root).as_posix(), text


def _hits(regexes, allowed, extra_allowed=()):
    found = []
    for rel, text in _python_sources():
        if rel == allowed or rel in extra_allowed:
            continue
        for rx in regexes:
            for m in rx.finditer(text):
                found.append("%s:%d" % (rel, text.count("\n", 0, m.start()) + 1))
    return found


class AttendanceGuardTests(SimpleTestCase):
    def test_scanner_sees_the_project(self):
        rels = {rel for rel, _ in _python_sources()}
        self.assertIn("attendance/services.py", rels)
        self.assertIn("attendance/net.py", rels)

    def test_attendance_records_are_written_only_in_services(self):
        offenders = _hits([WRITE_CALL, CHAINED_WRITE], "attendance/services.py", SEED_COMMANDS)
        self.assertEqual(
            offenders, [],
            "AttendanceRecord written outside attendance/services.py: " + ", ".join(offenders),
        )

    def test_raw_client_address_is_read_only_in_net_py(self):
        offenders = _hits([RAW_IP], "attendance/net.py")
        self.assertEqual(
            offenders, [],
            "Raw IP header read outside attendance/net.py (use client_ip): " + ", ".join(offenders),
        )