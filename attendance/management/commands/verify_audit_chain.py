import hashlib

from django.core.management.base import BaseCommand, CommandError

from attendance.models import AttendanceAudit


def _candidate_hashes(row, prev):
    """Older rows may have hashed a missing IP as 'None'; accept both forms."""
    ip = row.ip_address
    for ip_text in {ip or "", str(ip)}:
        data = (
            f"{row.record_id}|{row.action}|{row.old_status}|{row.new_status}"
            f"|{row.actor_id}|{ip_text}|{prev}"
        )
        yield hashlib.sha256(data.encode()).hexdigest()


class Command(BaseCommand):
    help = "Recompute every attendance audit hash chain and report tampering."

    def handle(self, *args, **options):
        checked = legacy = 0
        problems = []
        current_record, prev = None, ""
        rows = AttendanceAudit.objects.order_by("record_id", "id").iterator(chunk_size=2000)
        for row in rows:
            if row.record_id != current_record:
                current_record, prev = row.record_id, ""
            if not row.row_hash:
                legacy += 1
            elif row.prev_hash != prev:
                problems.append(f"audit #{row.pk} (record {row.record_id}): chain broken")
            elif row.row_hash not in set(_candidate_hashes(row, row.prev_hash)):
                problems.append(f"audit #{row.pk} (record {row.record_id}): hash mismatch")
            checked += 1
            prev = row.row_hash

        self.stdout.write(f"Checked {checked} audit rows ({legacy} legacy rows without a hash).")
        if problems:
            for line in problems:
                self.stderr.write(line)
            raise CommandError(f"{len(problems)} tampered or broken audit row(s) found.")
        self.stdout.write(self.style.SUCCESS("Audit chain OK."))