from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from announcements.models import Announcement
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
    {"bus_number": "B09", "rfid_uid": "DEMO-RFID-009", "route": "Route 9 - Hostel Extension","departure_time": "06:15", "length_m": 12.0, "width_m": 2.5},
    {"bus_number": "B10", "rfid_uid": "DEMO-RFID-010", "route": "Route 10 - Tech Park",     "departure_time": "10:30", "length_m": 12.0, "width_m": 2.5},
    {"bus_number": "B11", "rfid_uid": "DEMO-RFID-011", "route": "Route 11 - Old Campus",    "departure_time": "07:15", "length_m": 12.0, "width_m": 2.5},
    {"bus_number": "B12", "rfid_uid": "DEMO-RFID-012", "route": "Route 12 - New Block",     "departure_time": "09:15", "length_m": 12.0, "width_m": 2.5},
]

# Row A, slot 1 -> slot 8, explicit bus numbers (reverse departure order so
# B08 sits closest to the exit and blocks everyone behind it).
ROW_A_PLAN = ["B08", "B07", "B06", "B05", "B04", "B03", "B02", "B01"]

# Extra buses parked outside row A, deliberately scattered (not sequential from
# slot 1) to look like a messy real-world yard: two in the middle rows, one
# alone in a corner slot.
EXTRA_PARKING = [
    ("B09", "B", 3),
    ("B10", "B", 6),
    ("B11", "C", 2),
    ("B12", "D", 8),
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
        buses_by_number = {}
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
            buses_by_number[data["bus_number"]] = bus
        self.stdout.write(self.style.SUCCESS(f"  {len(DEMO_BUSES)} demo buses ready"))

        # --- Park buses at explicit slots (idempotent: skip anyone already parked) ---
        def park(bus_number, row, slot_number):
            bus = buses_by_number.get(bus_number)
            if not bus:
                return
            if ParkingSlot.objects.filter(bus=bus).exists():
                return  # already parked somewhere, don't touch it
            slot = ParkingSlot.objects.filter(row=row, slot_number=slot_number, is_occupied=False).first()
            if not slot:
                return  # target slot already taken by a different bus
            slot.bus = bus
            slot.is_occupied = True
            slot.save()

        for slot_number, bus_number in enumerate(ROW_A_PLAN, start=1):
            park(bus_number, "A", slot_number)

        for bus_number, row, slot_number in EXTRA_PARKING:
            park(bus_number, row, slot_number)

        # Recompute blocked
        for slot in ParkingSlot.objects.filter(is_occupied=True):
            blocking = ParkingSlot.objects.filter(
                row=slot.row, is_occupied=True,
                slot_number__lt=slot.slot_number,
            ).exists()
            slot.is_blocked = blocking
            slot.save(update_fields=["is_blocked"])
        self.stdout.write(self.style.SUCCESS("  Buses parked (row A reversed + scattered extras)"))

        # --- Sensors ---
        for data in DEMO_SENSORS:
            Sensor.objects.get_or_create(
                sensor_id=data["sensor_id"],
                defaults={"sensor_type": data["sensor_type"], "location": data["location"]},
            )
        self.stdout.write(self.style.SUCCESS(f"  {len(DEMO_SENSORS)} demo sensors ready"))

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

        # --- Sample announcement (students see this in the bell menu) ---
        Announcement.objects.get_or_create(
            title="Welcome to Smart Bus Parking",
            defaults={
                "message": "Find your bus in the Find Bus page. Transport staff will post schedule changes here.",
                "priority": "INFO",
                "author": User.objects.filter(username="staff").first(),
            },
        )
        self.stdout.write(self.style.SUCCESS("  Sample announcement ready"))

        self.stdout.write(self.style.SUCCESS("\nDemo data seeded successfully!"))
