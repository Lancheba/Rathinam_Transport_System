from django.contrib import admin

from .models import AttendanceRecord, AttendanceSession, Teacher


@admin.register(Teacher)
class TeacherAdmin(admin.ModelAdmin):
    list_display = ("staff_id", "name", "department", "bus")
    list_filter = ("department", "bus")
    search_fields = ("name", "staff_id", "department")


class AttendanceRecordInline(admin.TabularInline):
    model = AttendanceRecord
    extra = 0


@admin.register(AttendanceSession)
class AttendanceSessionAdmin(admin.ModelAdmin):
    list_display = ("bus", "date", "is_holiday", "marked_by")
    list_filter = ("is_holiday", "bus")
    date_hierarchy = "date"
    inlines = [AttendanceRecordInline]
