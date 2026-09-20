from django.contrib import admin
from .models import Announcement


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ("title", "priority", "author", "created_at")
    list_filter = ("priority",)
    search_fields = ("title", "message")
    readonly_fields = ("created_at", "updated_at")
