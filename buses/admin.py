from django.contrib import admin
from .models import Bus


@admin.register(Bus)
class BusAdmin(admin.ModelAdmin):
    list_display = (
        "bus_number",
        "rfid_uid",
        "route",
        "departure_time",
        "length_m",
        "width_m",
        "is_active",
        "driver",
        "student_capacity",
        "teacher_capacity",
    )

    search_fields = ("bus_number", "rfid_uid", "route", "driver__username")
    list_filter = ("is_active",)