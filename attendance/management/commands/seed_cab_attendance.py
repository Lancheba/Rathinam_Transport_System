import random
from datetime import date, time

from django.core.management.base import BaseCommand
from django.db import transaction

from buses.models import Bus
from students.models import Student
from attendance.models import AttendanceSession, AttendanceRecord

FIRST_NAMES = [
    "Arun", "Priya", "Karthik", "Divya", "Suresh", "Anjali", "Vikram", "Meera",
    "Rajesh", "Sneha", "Manoj", "Kavya", "Deepak", "Pooja", "Naveen", "Swathi",
    "Ashok", "Nithya", "Praveen", "Lakshmi", "Gokul", "Ramya", "Hari", "Sindhu",
    "Sathish", "Bhavya", "Vignesh", "Aparna", "Dinesh", "Keerthi",
]
LAST_NAMES = [
    "Kumar", "Raj", "Prasad", "Nair", "Iyer", "Reddy", "Pillai", "Menon",
    "Krishnan", "Sundaram",
]
DEPARTMENTS = ["CSE", "IT", "ECE", "EEE", "MECH"]
BOARDING_POINTS = ["Anna Nagar", "Vadapalani", "Koyambedu", "T. Nagar", "Guindy"]


class Command(BaseCommand):
    help = (
        "Seeds N students (default 30) onto a single cab/bus, then creates "
        "today's attendance session for that cab with realistic present/"
        "absent marks. Useful for testing the driver attendance flow "
        "end-to-end without using the UI."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--bus-number", default="TEST-CAB-01",
            help="Bus number to use/create (default: TEST-CAB-01).",
        )
        parser.add_argument(
            "--count", type=int, default=30,
            help="How many students to seed onto the cab (default: 30).",
        )
        parser.add_argument(
            "--absent", type=int, default=3,
            help="How many of them to mark absent today (default: 3).",
        )
        parser.add_argument(
            "--fresh", action="store_true",
            help="Delete any students already on this bus before seeding.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        bus_number = options["bus_number"]
        count = options["count"]
        absent_n = min(options["absent"], count)

        bus, created = Bus.objects.get_or_create(
            bus_number=bus_number,
            defaults={
                "rfid_uid": f"RFID-{bus_number}",
                "route": "Test Route",
                "departure_time": time(7, 30),
                "length_m": 10,
                "width_m": 2.5,
                "student_capacity": count,
            },
        )
        self.stdout.write(self.style.SUCCESS(
            f"[bus] {'created' if created else 'using existing'}: {bus.bus_number} (id={bus.id})"
        ))

        if options["fresh"]:
            old_count, _ = Student.objects.filter(bus=bus).delete()
            if old_count:
                self.stdout.write(self.style.WARNING(
                    f"[students] cleared {old_count} previous student(s) on {bus.bus_number}"
                ))

        existing_rolls = set(Student.objects.values_list("roll_number", flat=True))
        students = []
        for _ in range(count):
            dept = random.choice(DEPARTMENTS)
            for _ in range(20):
                roll = f"25{dept[:2]}{random.randint(100, 999)}"
                if roll not in existing_rolls:
                    existing_rolls.add(roll)
                    break
            students.append(Student(
                name=f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}",
                roll_number=roll,
                department=dept,
                year=random.choice([1, 2, 3, 4]),
                phone=f"9{random.randint(100000000, 999999999)}",
                boarding_point=random.choice(BOARDING_POINTS),
                bus=bus,
            ))
        Student.objects.bulk_create(students)
        self.stdout.write(self.style.SUCCESS(
            f"[students] seeded {len(students)} students onto {bus.bus_number}"
        ))

        roster = list(Student.objects.filter(bus=bus).order_by("roll_number"))
        absent_ids = set(random.sample([s.id for s in roster], k=min(absent_n, len(roster))))

        session, _ = AttendanceSession.objects.update_or_create(
            bus=bus,
            date=date.today(),
            defaults={"is_holiday": False, "holiday_reason": ""},
        )
        session.records.all().delete()

        records = [
            AttendanceRecord(
                session=session, person_type="STUDENT", student=s,
                status="ABSENT" if s.id in absent_ids else "PRESENT",
            )
            for s in roster
        ]
        AttendanceRecord.objects.bulk_create(records)

        present = sum(1 for r in records if r.status == "PRESENT")
        absent = len(records) - present

        self.stdout.write(f"\n[attendance] session for {bus.bus_number} on {session.date}")
        self.stdout.write(f"  total on roster : {len(roster)}")
        self.stdout.write(f"  present         : {present}")
        self.stdout.write(f"  absent          : {absent}")

        self.stdout.write("\n[roster detail]")
        for r in AttendanceRecord.objects.filter(session=session).select_related("student").order_by("student__roll_number"):
            mark = "P" if r.status == "PRESENT" else "A"
            s = r.student
            self.stdout.write(f"  [{mark}] {s.roll_number}  {s.name:<22} {s.department:<6} {s.boarding_point}")

        assert Student.objects.filter(bus=bus).count() >= count
        assert AttendanceRecord.objects.filter(session=session).count() == len(roster)
        self.stdout.write(self.style.SUCCESS(
            f"\n[OK] {count} students on cab '{bus.bus_number}', attendance session created and verified."
        ))
