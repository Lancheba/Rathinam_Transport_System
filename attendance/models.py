from datetime import time

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class AttendanceWindowConfig(models.Model):
    """
    Singleton row controlling what time of day the MORNING and EVENING
    attendance-taking windows open and close.

    Previously these cutoffs (05:00-09:30 / 16:30-19:30) were hardcoded in
    attendance/qr_views.py and the finalize_attendance/run_attendance_clock
    management commands. This model makes them editable at runtime by
    admins and transport staff (see attendance/views.py::attendance_window_config
    and the Settings page in the frontend), with no redeploy needed.

    Always use `AttendanceWindowConfig.get_solo()` to fetch it, which
    creates the single row (pk=1) with sane defaults on first access.
    """

    morning_start = models.TimeField(default=time(5, 0))
    morning_end = models.TimeField(default=time(9, 30))
    evening_start = models.TimeField(default=time(16, 30))
    evening_end = models.TimeField(default=time(19, 30))

    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="attendance_window_updates",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Attendance window configuration"
        verbose_name_plural = "Attendance window configuration"

    def __str__(self):
        return (
            f"Morning {self.morning_start.strftime('%H:%M')}-{self.morning_end.strftime('%H:%M')} / "
            f"Evening {self.evening_start.strftime('%H:%M')}-{self.evening_end.strftime('%H:%M')}"
        )

    def clean(self):
        errors = {}
        if self.morning_start >= self.morning_end:
            errors["morning_end"] = "Morning end time must be after morning start time."
        if self.evening_start >= self.evening_end:
            errors["evening_end"] = "Evening end time must be after evening start time."
        if not errors and self.morning_end > self.evening_start:
            errors["evening_start"] = "Evening start time must be after morning end time."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.pk = 1  # enforce singleton
        self.full_clean()
        super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls):
        obj, _created = cls.objects.get_or_create(pk=1)
        return obj


class Teacher(models.Model):
    name = models.CharField(max_length=150)
    staff_id = models.CharField(max_length=30, unique=True)
    department = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    bus = models.ForeignKey(
        "buses.Bus",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="teachers",
    )
    boarding_point = models.CharField(max_length=150, blank=True)
    linked_user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="teacher_profile",
        help_text="The login account of this teacher. Set only after staff approval.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.staff_id} - {self.name}"


class AttendanceSession(models.Model):
    SLOT_CHOICES = [("MORNING", "Morning"), ("EVENING", "Evening")]

    bus = models.ForeignKey(
        "buses.Bus", on_delete=models.CASCADE, related_name="attendance_sessions"
    )
    date = models.DateField()
    slot = models.CharField(max_length=10, choices=SLOT_CHOICES, default="MORNING")

    is_holiday = models.BooleanField(default=False)
    holiday_reason = models.CharField(max_length=200, blank=True)

    marked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="attendance_sessions_marked",
    )

    opened_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    auto_finalized = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-slot"]
        constraints = [
            models.UniqueConstraint(
                fields=["bus", "date", "slot"],
                name="unique_attendance_session_per_bus_day_slot",
            )
        ]

    def __str__(self):
        tag = "HOLIDAY" if self.is_holiday else self.slot
        return f"{self.bus.bus_number} {self.date} ({tag})"


class AttendanceRecord(models.Model):
    PERSON_TYPES = [("STUDENT", "Student"), ("TEACHER", "Teacher")]
    STATUS_CHOICES = [("PRESENT", "Present"), ("ABSENT", "Absent")]
    SOURCE_CHOICES = [
        ("MANUAL", "Manual"),
        ("QR_FACE", "QR + Face"),
        ("AUTO_ABSENT", "Auto-absent"),
    ]

    session = models.ForeignKey(
        AttendanceSession, on_delete=models.CASCADE, related_name="records"
    )
    person_type = models.CharField(max_length=10, choices=PERSON_TYPES)
    student = models.ForeignKey(
        "students.Student",
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name="attendance_records",
    )
    teacher = models.ForeignKey(
        Teacher,
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name="attendance_records",
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="ABSENT")
    remarks = models.CharField(max_length=200, blank=True)
    source = models.CharField(max_length=15, choices=SOURCE_CHOICES, default="MANUAL")
    marked_at = models.DateTimeField(null=True, blank=True)
    face_match_score = models.FloatField(null=True, blank=True)
    locked_at = models.DateTimeField(null=True, blank=True)
    corrected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="attendance_corrections",
    )
    corrected_at = models.DateTimeField(null=True, blank=True)
    is_correction = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["person_type", "id"]
        constraints = [
            models.UniqueConstraint(fields=["session", "student"], name="unique_attendance_record_student"),
            models.UniqueConstraint(fields=["session", "teacher"], name="unique_attendance_record_teacher"),
        ]

    def __str__(self):
        who = self.student or self.teacher
        return f"{who} - {self.status} ({self.session})"


class AttendanceQRToken(models.Model):
    bus = models.ForeignKey(
        "buses.Bus", on_delete=models.CASCADE, related_name="qr_tokens"
    )
    date = models.DateField()
    slot = models.CharField(max_length=10, choices=AttendanceSession.SLOT_CHOICES)
    token = models.CharField(max_length=64, unique=True, db_index=True)
    issued_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    issued_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        indexes = [
            models.Index(fields=["bus", "date", "slot"], name="att_qr_bus_date_slot_idx")
        ]

    def __str__(self):
        return f"QRToken({self.bus.bus_number} {self.date} {self.slot})"


class AttendanceAudit(models.Model):
    """
    Append-only log of every change to an AttendanceRecord.
    Written by the service layer; never updated or deleted.
    Audit item 2.4.
    """
    ACTION_CHOICES = [
        ('CREATE',      'Created'),
        ('SCAN',        'QR/Face scan'),
        ('MANUAL',      'Manual mark by in-charge'),
        ('CORRECT',     'Corrected by staff/admin'),
        ('AUTO_ABSENT', 'Auto-marked absent'),
        ('SUBMIT',      'Driver submit'),
        ('REVOKE',      'Revoked by admin'),
        ('DELETE_BLOCKED', 'Delete attempt blocked'),
    ]

    record     = models.ForeignKey(
        AttendanceRecord, on_delete=models.CASCADE, related_name='audit_trail'
    )
    action     = models.CharField(max_length=15, choices=ACTION_CHOICES)
    old_status = models.CharField(max_length=10, blank=True)
    new_status = models.CharField(max_length=10)
    actor      = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='attendance_audit_entries'
    )
    reason     = models.CharField(max_length=500, blank=True)
    source     = models.CharField(max_length=15, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=300, blank=True)
    session    = models.ForeignKey(
        'attendance.AttendanceSession', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='audit_entries',
    )
    prev_hash  = models.CharField(max_length=64, blank=True)
    row_hash   = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'Audit({self.record_id} {self.action} {self.created_at:%Y-%m-%d %H:%M})'

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValueError('AttendanceAudit rows are append-only and cannot be updated.')
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError('AttendanceAudit rows cannot be deleted.')


class Holiday(models.Model):
    """A no-attendance day for ALL buses. Admins add these once."""

    date = models.DateField(unique=True)
    reason = models.CharField(max_length=200, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="holidays_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"{self.date} - {self.reason or 'Holiday'}"
