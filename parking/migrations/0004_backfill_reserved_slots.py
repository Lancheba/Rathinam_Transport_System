from django.db import migrations


def backfill_reserved_slots(apps, schema_editor):
    ParkingSlot = apps.get_model("parking", "ParkingSlot")
    ParkingSlot.objects.filter(row__in=["B", "C"], slot_number__in=[1, 2, 3]).update(slot_type="RESERVED")


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("parking", "0003_parkingslot_is_active_parkingslot_slot_type_and_more"),
    ]

    operations = [
        migrations.RunPython(backfill_reserved_slots, noop),
    ]
