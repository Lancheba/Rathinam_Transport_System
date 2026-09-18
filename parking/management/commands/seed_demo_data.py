from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from buses.models import Bus
from parking.models import ParkingGround, ParkingSlot
from sensors.models import Sensor, ParkingEvent


DEMO_BUSES = [
    {"bus_number": "B01", "rfid_uid": "DEMO-RFID-001", "route": "Route 1 - City Centre",   "departure_time": "06:30", "length_m": 12.0, "width_m": 2.5},
    {"bus_number": "B02", "rfid_uid": "DEMO-RFID-002", "route": "Route 2 - North Campus",   "departure_time": "07:00", "length_m": 12.0, "width_m": 2.5},
    {"bus_number": "B03", "rfid_uid": "DEMO-RFID-003", "route": "Route 3 - East Gate",      "departure_time": "07:30", "length_m": 12.0, "width_m": 2.5},
    {"bus_number": "B04", "rfid_uid": "DEMO-RFID-004", "route": "Route 4 - South Block",    "departure_time": "08:00", "length_m": 12.0, "width_m": 2.5},
    {"bus_number": "B05", "rfid_uid": "DEMO-RFID-005", "route": "Route 5 - West Hostel",    "departure_time": "08:30", "length_m": 12.0, "width_m": 2.5},
    {"bus_number": "B06", "rfid_uid": "DEMO-RFID-006", "route": "Route 6 - Library Loop",   "departure_time": "09:00", "length_m": 12.0, "width_m": 2.5},
    {"bus_number": "B07", "rfid_uid": "DEMO-RFID-007", "route": "Route 7 - Admin Block",    "departure_time": "09:30", "length_m": 12.0, "width_m": 2.5},
    {"bus_number": "B08", "rfid_uid": "DEMO-RFID-008", "route": "Route 8 - Sports Block",   "departure_time": "10:00", "length_m": 12.0, "width_m": 2.5},
]

DEMO_SENSORS = [
    {"sensor_id": "RFID-001", "sensor_type": "RFID",       "location": "Ground Entry Gate"},
    {"sensor_id": "RFID-002", "sensor_type": "RFID",       "location": "Row A Entrance"},
    {"sensor_id": "US-001",   "sensor_type": "ULTRASONIC", "location": "Row A Slot 1"},
    {"sensor_id": "US-002",   "sensor_type": "ULTRASONIC", "location": "Row A Slot 2"},
    {"sensor_id": "US-003",   "sensor_type": "ULTRASONIC", "location": "Row B Slot 1"},
    {"sensor_id": "US-004",   "sensor_type": "ULTRASONIC", "location": "Row B Slot 2"},
]


class Command(BaseCommand):
    help = "Seed demo data: buses, sensors, admin user, and initial parking assignment"

    def handle(self, *args, **options):
        self.stdout.write("Seeding demo data...")

        # --- Ground & Slots ---
        ground, _ = ParkingGround.objects.get_or_create(
            name="College Bus Parking Ground",
            defaults={"length_m": 60, "width_m": 35,
                      "entrance_width_m": 6, "exit_width_m": 6, "total_slots": 32},
        )

        rows = ["A", "B", "C", "D"]
        for row_index, row in enumerate(rows):
            for slot_number in range(1, 9):
                x = 5 + (slot_number - 1) * 6
                y = 5 + row_index * 7
                ParkingSlot.objects.get_or_create(
                    ground=ground, row=row, slot_number=slot_number,
                    defaults={"x_position_m": x, "y_position_m": y},
                )
        self.stdout.write(self.style.SUCCESS("  32 slots ready"))

        # --- Buses ---
        buses = []
        for data in DEMO_BUSES:
            bus, created = Bus.objects.get_or_create(
                bus_number=data["bus_number"],
                defaults={
                    "rfid_uid": data["rfid_uid"],
                    "route": data["route"],
                    "departure_time": data["departure_time"],
                    "length_m": data["length_m"],
                    "width_m": data["width_m"],
                },
            )
            buses.append(bus)
        self.stdout.write(self.style.SUCCESS("  8 demo buses ready"))

        # --- Park buses in a realistic (non-optimal) arrangement ---
        # Intentionally park them in reverse departure order so some are blocked
        slots_qs = list(
            ParkingSlot.objects.filter(is_occupied=False)
            .order_by("row", "slot_number")[:8]
        )
        reversed_buses = list(reversed(buses))  # B08 goes in slot 1 (blocks earlier buses)
        for slot, bus in zip(slots_qs, reversed_buses):
            slot.bus = bus
            slot.is_occupied = True
            slot.save()

        # Recompute blocked
        for slot in ParkingSlot.objects.filter(is_occupied=True):
            blocking = ParkingSlot.objects.filter(
                row=slot.row, is_occupied=True,
                slot_number__lt=slot.slot_number,
            ).exists()
            slot.is_blocked = blocking
            slot.save(update_fields=["is_blocked"])
        self.stdout.write(self.style.SUCCESS("  Buses parked (reverse order to show blocking)"))

        # --- Sensors ---
        for data in DEMO_SENSORS:
            Sensor.objects.get_or_create(
                sensor_id=data["sensor_id"],
                defaults={"sensor_type": data["sensor_type"], "location": data["location"]},
            )
        self.stdout.write(self.style.SUCCESS("  6 demo sensors ready"))

        # --- Admin user ---
        if not User.objects.filter(username="admin").exists():
            User.objects.create_superuser("admin", "admin@rathinam.ac.in", "admin123")
            self.stdout.write(self.style.SUCCESS("  Admin user created (admin / admin123)"))
        else:
            self.stdout.write("  Admin user already exists")

        # --- Staff user ---
        if not User.objects.filter(username="staff").exists():
            staff = User.objects.create_user("staff", "staff@rathinam.ac.in", "staff123")
            staff.profile.role = "STAFF"
            staff.profile.save()
            self.stdout.write(self.style.SUCCESS("  Staff user created (staff / staff123)"))

        self.stdout.write(self.style.SUCCESS("\nDemo data seeded successfully!"))
