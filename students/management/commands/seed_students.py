import random

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from buses.models import Bus
from students.models import Student

FIRST_NAMES = [
    "Arun", "Priya", "Karthik", "Divya", "Suresh", "Anjali", "Vikram", "Meera",
    "Rajesh", "Sneha", "Manoj", "Kavya", "Deepak", "Pooja", "Naveen", "Swathi",
    "Ashok", "Nithya", "Praveen", "Lakshmi", "Gokul", "Ramya", "Hari", "Sindhu",
    "Sathish", "Bhavya", "Vignesh", "Aparna", "Dinesh", "Keerthi", "Balaji", "Roshni",
]
LAST_NAMES = [
    "Kumar", "Raj", "Prasad", "Nair", "Iyer", "Reddy", "Pillai", "Menon",
    "Krishnan", "Sundaram", "Murugan", "Raman", "Subramaniam", "Varma", "Sharma", "Gopal",
]
DEPARTMENTS = ["CSE", "IT", "ECE", "EEE", "MECH", "CIVIL", "AIDS", "AIML", "BIOTECH", "MBA"]
BOARDING_POINTS = [
    "Anna Nagar", "Vadapalani", "Ashok Nagar", "Koyambedu", "T. Nagar", "Guindy",
    "Velachery", "Tambaram", "Chrompet", "Porur", "Saligramam", "Vadapalani Signal",
    "Kodambakkam", "Nungambakkam", "Adyar",
]


class Command(BaseCommand):
    help = (
        "Seed demo students onto your existing buses so the Students dashboard has "
        "something to show. Spreads --count students round-robin across every active "
        "bus, with randomised (but plausible) names, roll numbers, departments and "
        "boarding points. Safe to re-run: roll numbers are generated fresh each time "
        "with a random suffix, so re-running adds more students rather than clashing."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--count", type=int, default=32,
            help="How many students to create in total (default: 32).",
        )
        parser.add_argument(
            "--clear", action="store_true",
            help="Delete all existing students before seeding new ones.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        count = options["count"]
        if count < 1:
            raise CommandError("--count must be at least 1.")

        buses = list(Bus.objects.all().order_by("bus_number"))
        if not buses:
            raise CommandError(
                "No buses exist yet. Add buses first (Bus Information page, or the "
                "Django admin), then re-run this command."
            )

        if options["clear"]:
            deleted, _ = Student.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"Cleared {deleted} existing student(s)."))

        existing_rolls = set(Student.objects.values_list("roll_number", flat=True))
        year = 21  # admission year prefix, e.g. "21"
        created = []

        for i in range(count):
            bus = buses[i % len(buses)]
            dept = random.choice(DEPARTMENTS)
            first = random.choice(FIRST_NAMES)
            last = random.choice(LAST_NAMES)

            # Roll number like "21CS0147" — retry on the rare random clash.
            for _ in range(20):
                roll = f"{year}{dept[:2]}{random.randint(100, 999)}"
                if roll not in existing_rolls:
                    existing_rolls.add(roll)
                    break

            student = Student(
                name=f"{first} {last}",
                roll_number=roll,
                department=dept,
                year=random.choice([1, 2, 3, 4]),
                phone=f"9{random.randint(100000000, 999999999)}",
                boarding_point=random.choice(BOARDING_POINTS),
                bus=bus,
            )
            created.append(student)

        Student.objects.bulk_create(created)

        per_bus = {}
        for s in created:
            per_bus[s.bus.bus_number] = per_bus.get(s.bus.bus_number, 0) + 1

        self.stdout.write(self.style.SUCCESS(
            f"Created {len(created)} student(s) across {len(per_bus)} bus(es)."
        ))
        for bus_number, n in sorted(per_bus.items()):
            self.stdout.write(f"  {bus_number}: {n} student(s)")
