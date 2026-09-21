import csv

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from buses.models import Bus
from students.models import Student


class Command(BaseCommand):
    help = (
        "Bulk-load students from a CSV file, one row per student, and assign "
        "each to a bus by bus_number. Handy for onboarding a whole college's "
        "roster (e.g. all 32 buses) in one go instead of adding students "
        "one at a time in the UI.\n\n"
        "Expected columns (header row required): "
        "roll_number,name,department,year,phone,email,boarding_point,bus_number\n"
        "Only roll_number and name are required; bus_number may be left blank "
        "for a student who isn't assigned to a bus yet. "
        "Re-running is safe: an existing roll_number is updated, not duplicated."
    )

    def add_arguments(self, parser):
        parser.add_argument("csv_path", help="Path to the CSV file")
        parser.add_argument(
            "--dry-run", action="store_true",
            help="Validate the file and report what would happen, without saving anything.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        path = options["csv_path"]
        dry_run = options["dry_run"]

        try:
            f = open(path, newline="", encoding="utf-8-sig")
        except OSError as exc:
            raise CommandError(f"Couldn't open {path}: {exc}")

        with f:
            reader = csv.DictReader(f)
            if not reader.fieldnames or "roll_number" not in reader.fieldnames or "name" not in reader.fieldnames:
                raise CommandError("CSV must have a header row including at least 'roll_number' and 'name'.")

            bus_cache = {b.bus_number.upper(): b for b in Bus.objects.all()}

            created, updated, skipped = 0, 0, 0
            errors = []

            for line_no, row in enumerate(reader, start=2):  # header is line 1
                roll_number = (row.get("roll_number") or "").strip().upper()
                name = (row.get("name") or "").strip()
                if not roll_number or not name:
                    errors.append(f"Line {line_no}: roll_number and name are required — skipped.")
                    skipped += 1
                    continue

                bus_number = (row.get("bus_number") or "").strip().upper()
                bus = None
                if bus_number:
                    bus = bus_cache.get(bus_number)
                    if bus is None:
                        errors.append(f"Line {line_no}: no bus numbered '{bus_number}' — left unassigned.")

                defaults = {
                    "name": name,
                    "department": (row.get("department") or "").strip(),
                    "phone": (row.get("phone") or "").strip(),
                    "email": (row.get("email") or "").strip(),
                    "boarding_point": (row.get("boarding_point") or "").strip(),
                    "bus": bus,
                }
                year_raw = (row.get("year") or "").strip()
                if year_raw:
                    try:
                        defaults["year"] = int(year_raw)
                    except ValueError:
                        errors.append(f"Line {line_no}: '{year_raw}' isn't a valid year number — left blank.")

                if dry_run:
                    exists = Student.objects.filter(roll_number__iexact=roll_number).exists()
                    updated += exists
                    created += not exists
                    continue

                _, was_created = Student.objects.update_or_create(
                    roll_number=roll_number, defaults=defaults,
                )
                created += was_created
                updated += not was_created

            if dry_run:
                self.stdout.write(self.style.WARNING("Dry run — nothing was saved."))

            for msg in errors:
                self.stdout.write(self.style.WARNING(msg))

            self.stdout.write(self.style.SUCCESS(
                f"{created} student(s) would be created, {updated} updated, {skipped} skipped."
                if dry_run else
                f"{created} student(s) created, {updated} updated, {skipped} skipped."
            ))

            if dry_run:
                # Roll back — this is atomic and we never called save() with dry_run anyway,
                # but stay explicit in case the command grows write side-effects later.
                transaction.set_rollback(True)
