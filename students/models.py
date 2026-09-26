from students.fields import EncryptedListField
from django.conf import settings
from django.db import models


class Student(models.Model):
    YEAR_CHOICES = [
        (1, "1st Year"),
        (2, "2nd Year"),
        (3, "3rd Year"),
        (4, "4th Year"),
    ]

    name = models.CharField(max_length=150)
    roll_number = models.CharField(max_length=30, unique=True)
    department = models.CharField(max_length=100, blank=True)
    year = models.PositiveSmallIntegerField(choices=YEAR_CHOICES, null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)

    bus = models.ForeignKey(
        "buses.Bus",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="students",
    )

    boarding_point = models.CharField(
        max_length=150, blank=True,
        help_text="Stop where this student gets on the bus.",
    )

    linked_user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="student_profile",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["roll_number"]

    def __str__(self):
        return f"{self.roll_number} - {self.name}"


class FaceProfile(models.Model):
    student = models.OneToOneField(
        Student,
        on_delete=models.CASCADE,
        related_name="face_profile",
    )
    embedding = EncryptedListField()
    embedding_model = models.CharField(max_length=50, default="face-api-128d")
    retake_count = models.PositiveSmallIntegerField(default=0)
    consent_given = models.BooleanField(default=False)
    consent_at = models.DateTimeField(null=True, blank=True)
    enrolled_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"FaceProfile({self.student.roll_number})"


class FaceProfileAudit(models.Model):
    """
    Append-only log of who touched a student's face data and when.
    Written by the view/admin layer; never updated or deleted.
    """

    ENROLL = "ENROLL"
    REENROLL = "REENROLL"
    DELETE = "DELETE"
    ADMIN_READ = "ADMIN_READ"
    DUPE_ATTEMPT = "DUPE_ATTEMPT"   # ← new: someone tried to enroll another student's face

    ACTION_CHOICES = [
        (ENROLL, "Enrolled"),
        (REENROLL, "Re-enrolled"),
        (DELETE, "Deleted"),
        (ADMIN_READ, "Admin viewed"),
        (DUPE_ATTEMPT, "Duplicate face attempt"),
    ]

    student = models.ForeignKey(
        Student, on_delete=models.CASCADE, related_name="face_audit_entries",
    )
    action = models.CharField(max_length=16, choices=ACTION_CHOICES)   # was max_length=12
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="face_audit_entries",
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"FaceAudit({self.student_id} {self.action} {self.created_at:%Y-%m-%d %H:%M})"

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValueError("FaceProfileAudit rows are append-only and cannot be updated.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("FaceProfileAudit rows cannot be deleted.")
