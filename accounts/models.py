from django.db import models
from django.db.models import Q
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
    phone = models.CharField(max_length=20, blank=True, help_text="Contact number shown to riders.")

    def __str__(self):
        return f"{self.user.username} ({self.role})"

class LinkRequest(models.Model):
    """
    Something a user asks for that only takes effect once staff approve it:
      TEACHER     -> "this login is teacher <staff_id>"
      DRIVER_BUS  -> "this driver drives bus <bus_number>"
    Nothing is linked until approve() in accounts/linking.py runs.
    """

    TEACHER = "TEACHER"
    DRIVER_BUS = "DRIVER_BUS"
    KINDS = [(TEACHER, "Teacher roster link"), (DRIVER_BUS, "Driver bus claim")]

    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"
    STATUSES = [
        (PENDING, "Pending"),
        (APPROVED, "Approved"),
        (REJECTED, "Rejected"),
        (CANCELLED, "Cancelled"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="link_requests")
    kind = models.CharField(max_length=12, choices=KINDS)
    teacher = models.ForeignKey(
        "attendance.Teacher", null=True, blank=True,
        on_delete=models.CASCADE, related_name="link_requests",
    )
    bus = models.ForeignKey(
        "buses.Bus", null=True, blank=True,
        on_delete=models.CASCADE, related_name="link_requests",
    )
    status = models.CharField(max_length=10, choices=STATUSES, default=PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    decided_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="link_decisions",
    )
    decided_at = models.DateTimeField(null=True, blank=True)
    decision_note = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "kind"],
                condition=Q(status="PENDING"),
                name="one_pending_link_request_per_user_kind",
            ),
            models.CheckConstraint(
                check=(
                    Q(kind="TEACHER", teacher__isnull=False, bus__isnull=True)
                    | Q(kind="DRIVER_BUS", bus__isnull=False, teacher__isnull=True)
                ),
                name="link_request_target_matches_kind",
            ),
        ]

    def __str__(self):
        target = self.teacher or self.bus
        return f"{self.user.username} -> {target} ({self.status})"
