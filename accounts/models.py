from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    ROLES = [
        ("ADMIN", "Admin"),
        ("STAFF", "Transport Staff"),
        ("DRIVER", "Driver"),
        ("STUDENT", "Student"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    role = models.CharField(max_length=20, choices=ROLES, default="STUDENT")

    def __str__(self):
        return f"{self.user.username} ({self.role})"
