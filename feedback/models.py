from django.conf import settings
from django.db import models


class Feedback(models.Model):
    """
    A complaint, piece of feedback or suggestion sent in by a student or staff member.

    Only administrators can read these (see views.py). The person who sent it
    only gets a confirmation back.
    """

    KINDS = [
        ("COMPLAINT", "Complaint"),
        ("FEEDBACK", "Feedback"),
        ("SUGGESTION", "Suggestion"),
    ]
    CATEGORIES = [
        ("BUS", "Bus condition"),
        ("DRIVER", "Driver"),
        ("ROUTE", "Route or timing"),
        ("PARKING", "Parking"),
        ("APP", "This app"),
        ("OTHER", "Other"),
    ]
    STATUSES = [
        ("NEW", "New"),
        ("IN_REVIEW", "In review"),
        ("RESOLVED", "Resolved"),
    ]

    kind = models.CharField(max_length=12, choices=KINDS, default="COMPLAINT")
    category = models.CharField(max_length=10, choices=CATEGORIES, default="OTHER")
    subject = models.CharField(max_length=120)
    message = models.TextField(max_length=2000)

    # Optional: the bus the message is about
    bus = models.ForeignKey(
        "buses.Bus", null=True, blank=True, on_delete=models.SET_NULL, related_name="feedback"
    )

    # Left empty when the sender chose to stay anonymous, so it is not recoverable
    # even from the database. author_role is a snapshot ("Student", "Transport Staff").
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="feedback_sent",
    )
    author_role = models.CharField(max_length=20, blank=True)
    is_anonymous = models.BooleanField(default=False)

    status = models.CharField(max_length=10, choices=STATUSES, default="NEW")
    admin_note = models.TextField(max_length=1000, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        verbose_name_plural = "feedback"

    def __str__(self):
        return f"{self.get_kind_display()}: {self.subject}"
