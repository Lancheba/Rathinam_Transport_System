from django.conf import settings
from django.db import models


class Announcement(models.Model):
    """A notice posted by an admin or transport staff member for everyone to read."""

    PRIORITIES = [
        ("INFO", "Info"),
        ("IMPORTANT", "Important"),
        ("URGENT", "Urgent"),
    ]

    title = models.CharField(max_length=120)
    message = models.TextField(max_length=1000)
    priority = models.CharField(max_length=10, choices=PRIORITIES, default="INFO")

    # SET_NULL so a notice outlives the account that posted it
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="announcements",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return self.title
