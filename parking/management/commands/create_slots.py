from decimal import Decimal
from string import ascii_uppercase

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from parking.models import ParkingGround, ParkingSlot


class Command(BaseCommand):
    help = (
        "Create a parking ground and its slot grid from the values you pass in. "
        "Nothing is assumed: every dimension and count comes from the arguments. "
        "Safe to re-run; existing slots are left untouched."
    )

    def add_arguments(self, parser):
        parser.add_argument("--name", required=True, help="Name of the parking ground")
        parser.add_argument("--length", type=Decimal, required=True, help="Ground length in metres")
        parser.add_argument("--width", type=Decimal, required=True, help="Ground width in metres")
        parser.add_argument("--entrance-width", type=Decimal, required=True, help="Entrance width in metres")
        parser.add_argument("--exit-width", type=Decimal, required=True, help="Exit width in metres")
        parser.add_argument("--rows", type=int, required=True, help="Number of rows (A, B, C, ...)")
        parser.add_argument("--slots-per-row", type=int, required=True, help="Slots in each row")

    @transaction.atomic
    def handle(self, *args, **options):
        row_count = options["rows"]
        per_row = options["slots_per_row"]

        if not 1 <= row_count <= len(ascii_uppercase):
            raise CommandError(f"--rows must be between 1 and {len(ascii_uppercase)}.")
        if per_row < 1:
            raise CommandError("--slots-per-row must be at least 1.")
        for key in ("length", "width", "entrance_width", "exit_width"):
            if options[key] <= 0:
                raise CommandError(f"--{key.replace('_', '-')} must be greater than 0.")

        total_slots = row_count * per_row

        ground, created = ParkingGround.objects.get_or_create(
            name=options["name"],
            defaults={
                "length_m": options["length"],
                "width_m": options["width"],
                "entrance_width_m": options["entrance_width"],
                "exit_width_m": options["exit_width"],
                "total_slots": total_slots,
            },
        )

        # Spread slot positions evenly across the ground instead of using fixed spacing.
        x_step = ground.length_m / (per_row + 1)
        y_step = ground.width_m / (row_count + 1)

        new_slots = 0
        for row_index in range(row_count):
            row = ascii_uppercase[row_index]
            for slot_number in range(1, per_row + 1):
                _, slot_created = ParkingSlot.objects.get_or_create(
                    ground=ground,
                    row=row,
                    slot_number=slot_number,
                    defaults={
                        "x_position_m": round(x_step * slot_number, 2),
                        "y_position_m": round(y_step * (row_index + 1), 2),
                    },
                )
                new_slots += slot_created

        actual_total = ground.slots.count()
        if ground.total_slots != actual_total:
            ground.total_slots = actual_total
            ground.save(update_fields=["total_slots"])

        verb = "Created" if created else "Using existing"
        self.stdout.write(
            self.style.SUCCESS(
                f"{verb} ground '{ground.name}': {new_slots} new slot(s), {actual_total} total."
            )
        )
