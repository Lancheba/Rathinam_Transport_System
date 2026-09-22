from django.conf import settings
from django.db import models


class Teacher(models.Model):
    """
    Staff who ride a college bus, tracked the same way students are so a
    driver can take attendance for both groups on one form.
    """

    name = models.CharField(max_length=150)
    staff_id = models.CharField(max_length=30, unique=True)
    department = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)

    bus = models.ForeignKey(
        "buses.Bus",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
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
    """
    One row per bus, per calendar day. Either it's a working day (with
    AttendanceRecord rows underneath it for every student/teacher on that
    bus) or it's marked as a holiday, in which case no attendance is taken.
    """

    bus = models.ForeignKey("buses.Bus", on_delete=models.CASCADE, related_name="attendance_sessions")
    date = models.DateField()

    is_holiday = models.BooleanField(default=False)
    holiday_reason = models.CharField(max_length=200, blank=True)

    marked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="attendance_sessions_marked",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date"]
        constraints = [
            models.UniqueConstraint(fields=["bus", "date"], name="unique_attendance_session_per_bus_day"),
        ]

    def __str__(self):
        tag = "HOLIDAY" if self.is_holiday else "attendance"
        return f"{self.bus.bus_number} {self.date} ({tag})"


class AttendanceRecord(models.Model):
    PERSON_TYPES = [
        ("STUDENT", "Student"),
        ("TEACHER", "Teacher"),
    ]
    STATUS_CHOICES = [
        ("PRESENT", "Present"),
        ("ABSENT", "Absent"),
    ]

    session = models.ForeignKey(AttendanceSession, on_delete=models.CASCADE, related_name="records")
    person_type = models.CharField(max_length=10, choices=PERSON_TYPES)

    student = models.ForeignKey(
        "students.Student", on_delete=models.CASCADE, null=True, blank=True, related_name="attendance_records"
    )
    teacher = models.ForeignKey(
        Teacher, on_delete=models.CASCADE, null=True, blank=True, related_name="attendance_records"
    )

    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="ABSENT")
    remarks = models.CharField(max_length=200, blank=True)

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
