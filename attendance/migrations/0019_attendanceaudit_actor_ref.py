from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("attendance", "0018_attendancerecord_set_null_on_person_delete"),
    ]
    operations = [
        migrations.AddField(
            model_name="attendanceaudit",
            name="actor_ref",
            field=models.IntegerField(blank=True, editable=False, null=True),
        ),
    ]
