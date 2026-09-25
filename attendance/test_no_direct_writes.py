import re
from pathlib import Path

from django.test import SimpleTestCase

APP_DIR = Path(__file__).resolve().parent
ALLOWED_FILES = {
    "services.py",               # the service layer is the only writer
    "seed_attendance_history.py",  # dev-only seeders, refuse to run unless DEBUG
    "seed_cab_attendance.py",
}

FORBIDDEN = [
    r"AttendanceRecord\.objects\.(create|get_or_create|update_or_create|bulk_create|bulk_update)\(",
    r"AttendanceRecord\.objects[^\n]*\.(update|delete)\(",
    r"\.records\b[^\n]*\.(update|delete|create)\(",
    r"AttendanceAudit\.objects\.(create|bulk_create)\(",
    r"AttendanceAudit\.objects[^\n]*\.(update|delete)\(",
]


class NoDirectAttendanceWritesTest(SimpleTestCase):
    def test_only_services_writes_attendance(self):
        offenders = []
        for path in APP_DIR.rglob("*.py"):
            rel = path.relative_to(APP_DIR)
            if path.name.startswith("test") or "migrations" in rel.parts or path.name in ALLOWED_FILES:
                continue
            text = path.read_text(encoding="utf-8-sig")
            for number, line in enumerate(text.splitlines(), 1):
                if line.lstrip().startswith("#"):
                    continue
                if any(re.search(pattern, line) for pattern in FORBIDDEN):
                    offenders.append(f"{rel}:{number}: {line.strip()}")
        self.assertEqual(
            offenders, [],
            "Attendance must be written only through attendance.services.set_attendance:\n"
            + "\n".join(offenders),
        )
