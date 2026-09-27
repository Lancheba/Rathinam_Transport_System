# Generated migration: switch AttendanceRecord.student and .teacher to SET_NULL
# so deleting a student/teacher nulls the FK instead of cascading into
# the immutable-audit table and hitting the Postgres trigger.

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("attendance", "0017_alter_attendanceflag_rule_cabcombination"),
        ("students", "0005_encrypt_face_embedding"),
    ]

    operations = [
        migrations.AlterField(
            model_name="attendancerecord",
            name="student",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="attendance_records",
                to="students.student",
            ),
        ),
        migrations.AlterField(
            model_name="attendancerecord",
            name="teacher",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="attendance_records",
                to="attendance.teacher",
            ),
        ),
    ]
