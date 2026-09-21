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

    # A student without a bus yet (new admission, walks/self-transport) is fine.
    # If the bus is deleted the student record stays, just unassigned.
    bus = models.ForeignKey(
        "buses.Bus",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="students",
    )

    boarding_point = models.CharField(
        max_length=150, blank=True,
        help_text="Stop where this student gets on the bus."
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["roll_number"]

    def __str__(self):
        return f"{self.roll_number} - {self.name}"
