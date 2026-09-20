from rest_framework import serializers
from accounts.permissions import can_manage_announcement, role_label
from .models import Announcement


class AnnouncementSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_role = serializers.SerializerMethodField()
    # Lets the UI show a delete button only where the server would allow it
    can_edit = serializers.SerializerMethodField()

    class Meta:
        model = Announcement
        fields = [
            "id", "title", "message", "priority",
            "author_name", "author_role", "can_edit",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Enter a title.")
        return value

    def validate_message(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Enter a message.")
        return value

    def get_author_name(self, obj):
        return obj.author.username if obj.author else "Transport Office"

    def get_author_role(self, obj):
        return role_label(obj.author) if obj.author else "Transport Staff"

    def get_can_edit(self, obj):
        request = self.context.get("request")
        return bool(request and can_manage_announcement(request.user, obj))
