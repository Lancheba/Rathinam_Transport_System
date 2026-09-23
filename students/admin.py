from django.contrib import admin
from .models import Student


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ("roll_number", "name", "department", "year", "bus", "phone", "linked_user")
    list_filter = ("bus", "department", "year")
    search_fields = ("roll_number", "name", "department", "phone", "email", "linked_user__username")
    autocomplete_fields = ("bus", "linked_user")
    list_per_page = 50
