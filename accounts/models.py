from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    ROLES = [
        ("ADMIN", "Admin"),
        ("STAFF", "Transport Staff"),
        ("DRIVER", "Driver"),
        ("STUDENT", "Student"),
        ("INCHARGE", "Cab In-Charge"),
    ]

    IDENTITY_CHOICES = [
        ("STUDENT", "Student"),
        ("TEACHER", "Teacher"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    role = models.CharField(max_length=20, choices=ROLES, default="STUDENT")
    identity = models.CharField(
        max_length=10, choices=IDENTITY_CHOICES, null=True, blank=True,
        help_text="Underlying Student/Teacher identity, separate from role.",
    )

    def __str__(self):
        return f"{self.user.username} ({self.role})"
