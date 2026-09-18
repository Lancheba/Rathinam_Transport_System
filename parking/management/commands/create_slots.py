from django.core.management.base import BaseCommand
from parking.models import ParkingGround, ParkingSlot


class Command(BaseCommand):
    help = "Create parking slots for the bus parking ground"

    def handle(self, *args, **options):
        ground, created = ParkingGround.objects.get_or_create(
            name="College Bus Parking Ground",
            defaults={
                "length_m": 60.00,
                "width_m": 35.00,
                "entrance_width_m": 6.00,
                "exit_width_m": 6.00,
                "total_slots": 32,
            },
        )

        rows = ["A", "B", "C", "D"]

        for row_index, row in enumerate(rows):
            for slot_number in range(1, 9):

                x_position = 5 + ((slot_number - 1) * 6)
                y_position = 5 + (row_index * 7)

                ParkingSlot.objects.get_or_create(
                    ground=ground,
                    row=row,
                    slot_number=slot_number,
                    defaults={
                        "x_position_m": x_position,
                        "y_position_m": y_position,
                    },
                )

        self.stdout.write(
            self.style.SUCCESS(
                "32 parking slots created successfully."
            )
        )