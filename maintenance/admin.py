from django.contrib import admin

from .models import MaintenanceLog


@admin.register(MaintenanceLog)
class MaintenanceLogAdmin(admin.ModelAdmin):
    list_display = ("bus", "log_type", "date", "odometer_km", "cost", "fuel_liters", "logged_by")
    list_filter = ("log_type", "bus")
    search_fields = ("bus__bus_number", "notes")
    autocomplete_fields = ("bus",)
    list_per_page = 50
