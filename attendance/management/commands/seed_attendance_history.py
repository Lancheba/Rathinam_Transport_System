import random
from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.db import transaction

from buses.models import Bus
from students.models import Student
from attendance.models import AttendanceSession, AttendanceRecord


class Command(BaseCommand):
    help = (
        "Seeds MORNING attendance history for the past N days across all "
        "existing buses/students (skips any day that already has records — "
        "safe to run without clobbering real data). Useful for populating "
        "the Attendance Analytics dashboard with a trend to look at."
    )

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=45, help="How many days back to seed (default: 45).")
        parser.add_argument("--present-rate", type=float, default=0.85, help="Probability a student is marked present (default: 0.85).")

    @transaction.atomic
    def handle(self, *args, **options):
        days = options["days"]
        rate = options["present_rate"]

        buses = Bus.objects.all()
        if not buses.exists():
            self.stdout.write(self.style.ERROR("No buses found."))
            return

        today = date.today()
        total_sessions = 0
        total_records = 0

        for bus in buses:
            students = list(Student.objects.filter(bus=bus))
            if not students:
                continue
            for i in range(days):
                day = today - timedelta(days=i)
                if day.weekday() == 6:  # no Sunday service
                    continue
                session, created = AttendanceSession.objects.get_or_create(
                    bus=bus, date=day, slot="MORNING",
                    defaults={"is_holiday": False},
                )
                if session.records.exists():
                    continue  # already has real data — don't touch it
                records = [
                    AttendanceRecord(
                        session=session, person_type="STUDENT", student=s,
                        status="PRESENT" if random.random() < rate else "ABSENT",
                    )
                    for s in students
                ]
                AttendanceRecord.objects.bulk_create(records)
                total_sessions += 1
                total_records += len(records)

        self.stdout.write(self.style.SUCCESS(
            f"Seeded {total_sessions} session(s), {total_records} record(s) across {buses.count()} bus(es)."
        ))
