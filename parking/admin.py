from django.contrib import admin
from .models import ParkingGround, ParkingSlot


@admin.register(ParkingGround)
class ParkingGroundAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "length_m",
        "width_m",
        "entrance_width_m",
        "exit_width_m",
        "total_slots",
    )


@admin.register(ParkingSlot)
class ParkingSlotAdmin(admin.ModelAdmin):
    list_display = (
        "row",
        "slot_number",
        "ground",
        "slot_type",
        "is_active",
        "is_occupied",
        "is_blocked",
        "bus",
    )

    list_editable = (
        "slot_type",
        "is_active",
    )

    list_filter = (
        "ground",
        "row",
        "slot_type",
        "is_active",
        "is_occupied",
        "is_blocked",
    )

    search_fields = ("row", "bus__bus_number")