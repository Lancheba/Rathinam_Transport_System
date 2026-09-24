from buses.models import Bus
from students.models import Student

cabs = list(Bus.objects.filter(bus_number__startswith="CAB ").order_by("id"))
if not cabs:
    raise SystemExit("No CAB buses found. Run scripts/seed_cab_buses.py first.")

loose = list(Student.objects.filter(bus__isnull=True).order_by("id"))
for i, student in enumerate(loose):
    student.bus = cabs[i % len(cabs)]
    student.save(update_fields=["bus"])

print(f"Assigned {len(loose)} unassigned student(s) across {len(cabs)} CAB buses. Students that already had a bus were not touched.")