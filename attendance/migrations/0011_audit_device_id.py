from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('attendance', '0010_audit_immutable_trigger'),
    ]

    operations = [
        migrations.AddField(
            model_name='attendanceaudit',
            name='device_id',
            field=models.CharField(blank=True, max_length=128),
        ),
    ]