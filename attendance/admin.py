from django.contrib import admin

from students.models import FaceProfile

from .models import (
    AttendanceQRToken,
    AttendanceRecord,
    AttendanceSession,
    AttendanceWindowConfig,
    Teacher,
)


@admin.register(AttendanceWindowConfig)
class AttendanceWindowConfigAdmin(admin.ModelAdmin):
    list_display = ("morning_start", "morning_end", "evening_start", "evening_end", "updated_by", "updated_at")
    readonly_fields = ("updated_by", "updated_at")

    def has_add_permission(self, request):
        # Singleton: only one row (pk=1) should ever exist.
        return not AttendanceWindowConfig.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Teacher)
class TeacherAdmin(admin.ModelAdmin):
    list_display = ("staff_id", "name", "department", "bus")
    list_filter = ("department", "bus")
    search_fields = ("name", "staff_id", "department")


class AttendanceRecordInline(admin.TabularInline):
    model = AttendanceRecord
    extra = 0
    fields = ("person_type", "student", "teacher", "status", "source", "marked_at", "face_match_score", "remarks")


@admin.register(AttendanceSession)
class AttendanceSessionAdmin(admin.ModelAdmin):
    list_display = ("bus", "date", "slot", "is_holiday", "marked_by")
    list_filter = ("is_holiday", "slot", "bus")
    date_hierarchy = "date"
    inlines = [AttendanceRecordInline]


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ("session", "person_type", "student", "teacher", "status", "source", "marked_at", "face_match_score")
    list_filter = ("status", "source", "person_type")
    search_fields = ("student__name", "student__roll_number", "teacher__name", "teacher__staff_id")
    autocomplete_fields = ("student", "teacher")


@admin.register(AttendanceQRToken)
class AttendanceQRTokenAdmin(admin.ModelAdmin):
    list_display = ("bus", "date", "slot", "token", "issued_by", "issued_at", "expires_at")
    list_filter = ("slot", "bus")
    date_hierarchy = "date"
    search_fields = ("token", "bus__bus_number")
    readonly_fields = ("token", "issued_at")


@admin.register(FaceProfile)
class FaceProfileAdmin(admin.ModelAdmin):
    list_display = ("student", "enrollment_status", "consent_given", "embedding_model", "enrolled_at", "updated_at")
    list_filter = ("consent_given", "embedding_model")
    search_fields = ("student__name", "student__roll_number")
    readonly_fields = ("embedding_preview", "enrolled_at", "updated_at")
    exclude = ("embedding",)

    def enrollment_status(self, obj):
        return "Enrolled \u2713" if obj.embedding else "Not enrolled"
    enrollment_status.short_description = "Status"

    def embedding_preview(self, obj):
        if not obj.embedding:
            return "Not enrolled"
        return f"Enrolled \u2713 ({len(obj.embedding)}-dim vector, hidden)"
    embedding_preview.short_description = "Embedding"
