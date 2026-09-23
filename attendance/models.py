from django.conf import settings
from django.db import models


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
