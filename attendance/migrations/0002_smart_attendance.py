from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("attendance", "0001_initial"),
        ("buses", "0002_bus_driver_bus_student_capacity_bus_teacher_capacity"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # 1. Add slot field to AttendanceSession
        migrations.AddField(
            model_name="attendancesession",
            name="slot",
            field=models.CharField(
                choices=[("MORNING", "Morning"), ("EVENING", "Evening")],
                default="MORNING",
                max_length=10,
            ),
        ),
        # 2. Add opened_at, closed_at, auto_finalized to AttendanceSession
        migrations.AddField(
            model_name="attendancesession",
            name="opened_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="attendancesession",
            name="closed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="attendancesession",
            name="auto_finalized",
            field=models.BooleanField(default=False),
        ),
        # 3. Remove old unique constraint (bus, date) and add (bus, date, slot)
        migrations.RemoveConstraint(
            model_name="attendancesession",
            name="unique_attendance_session_per_bus_day",
        ),
        migrations.AddConstraint(
            model_name="attendancesession",
            constraint=models.UniqueConstraint(
                fields=["bus", "date", "slot"],
                name="unique_attendance_session_per_bus_day_slot",
            ),
        ),
        # 4. Add source, marked_at, face_match_score to AttendanceRecord
        migrations.AddField(
            model_name="attendancerecord",
            name="source",
            field=models.CharField(
                choices=[("MANUAL", "Manual"), ("QR_FACE", "QR + Face"), ("AUTO_ABSENT", "Auto-absent")],
                default="MANUAL",
                max_length=15,
            ),
        ),
        migrations.AddField(
            model_name="attendancerecord",
            name="marked_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="attendancerecord",
            name="face_match_score",
            field=models.FloatField(blank=True, null=True),
        ),
        # 5. Create AttendanceQRToken
        migrations.CreateModel(
            name="AttendanceQRToken",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("date", models.DateField()),
                ("slot", models.CharField(
                    choices=[("MORNING", "Morning"), ("EVENING", "Evening")],
                    max_length=10,
                )),
                ("token", models.CharField(db_index=True, max_length=64, unique=True)),
                ("issued_at", models.DateTimeField(auto_now_add=True)),
                ("expires_at", models.DateTimeField()),
                ("bus", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="qr_tokens",
                    to="buses.bus",
                )),
                ("issued_by", models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={"indexes": [models.Index(fields=["bus", "date", "slot"], name="att_qr_bus_date_slot_idx")]},
        ),
    ]
