from django.contrib import admin

from .models import VisionTrack


@admin.register(VisionTrack)
class VisionTrackAdmin(admin.ModelAdmin):
    list_display = ("camera_id", "track_id", "bus", "slot", "confidence", "is_active", "last_seen")
    list_filter = ("camera_id", "is_active")
    search_fields = ("bus__bus_number",)
