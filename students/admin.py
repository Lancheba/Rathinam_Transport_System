from django.contrib import admin
from .models import Student


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ("roll_number", "name", "department", "year", "bus", "phone")
    list_filter = ("bus", "department", "year")
    search_fields = ("roll_number", "name", "department", "phone", "email")
    autocomplete_fields = ("bus",)
    list_per_page = 50
