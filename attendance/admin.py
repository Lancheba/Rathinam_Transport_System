from django.contrib import admin

from attendance.net import client_ip
from students.models import FaceProfile, FaceProfileAudit

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

    def change_view(self, request, object_id, form_url="", extra_context=None):
        if request.method == "GET":
            profile = self.get_object(request, object_id)
            if profile is not None:
                FaceProfileAudit.objects.create(
                    student=profile.student, action=FaceProfileAudit.ADMIN_READ,
                    actor=request.user, ip_address=client_ip(request),
                )
        return super().change_view(request, object_id, form_url, extra_context)

    def enrollment_status(self, obj):
        return "Enrolled \u2713" if obj.embedding else "Not enrolled"
    enrollment_status.short_description = "Status"

    def embedding_preview(self, obj):
        if not obj.embedding:
            return "Not enrolled"
        return f"Enrolled \u2713 ({len(obj.embedding)}-dim vector, hidden)"
    embedding_preview.short_description = "Embedding"


from .models import Holiday  # noqa: E402


@admin.register(Holiday)
class HolidayAdmin(admin.ModelAdmin):
    list_display = ("date", "reason", "created_by", "created_at")
    search_fields = ("reason",)
    date_hierarchy = "date"
    readonly_fields = ("created_by", "created_at")

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


# ---- Step 2: read-only admin for attendance data (all changes go through set_attendance) ----
from .models import AttendanceAudit  # noqa: E402


class ReadOnlyRecordInline(AttendanceRecordInline):
    def has_add_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


admin.site.unregister(AttendanceSession)
admin.site.unregister(AttendanceRecord)


@admin.register(AttendanceSession)
class ReadOnlySessionAdmin(AttendanceSessionAdmin):
    inlines = [ReadOnlyRecordInline]

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(AttendanceRecord)
class ReadOnlyRecordAdmin(AttendanceRecordAdmin):
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(AttendanceAudit)
class AttendanceAuditAdmin(admin.ModelAdmin):
    list_display = ("id", "record", "action", "old_status", "new_status", "actor", "ip_address", "created_at")
    list_filter = ("action", "source")
    date_hierarchy = "created_at"

    def get_readonly_fields(self, request, obj=None):
        return [f.name for f in self.model._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False