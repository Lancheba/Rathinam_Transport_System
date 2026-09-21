from rest_framework import serializers

from accounts.permissions import role_label
from buses.models import Bus

from .models import Feedback


def _clean(value, label):
    value = value.strip()
    if not value:
        raise serializers.ValidationError(f"Enter a {label}.")
    return value


class FeedbackCreateSerializer(serializers.ModelSerializer):
    """What a student or staff member sends. They get this back, and nothing more."""

    bus = serializers.PrimaryKeyRelatedField(
        queryset=Bus.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = Feedback
        fields = ["id", "kind", "category", "subject", "message", "bus", "is_anonymous", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_subject(self, value):
        return _clean(value, "subject")

    def validate_message(self, value):
        value = _clean(value, "message")
        if len(value) < 10:
            raise serializers.ValidationError("Please write at least 10 characters.")
        return value

    def create(self, validated_data):
        user = self.context["request"].user
        anonymous = validated_data.get("is_anonymous", False)
        return Feedback.objects.create(
            author=None if anonymous else user,
            author_role=role_label(user),
            **validated_data,
        )


class FeedbackAdminSerializer(serializers.ModelSerializer):
    """What administrators see. Only status and admin_note can be changed."""

    bus_number = serializers.CharField(source="bus.bus_number", read_only=True, default=None)
    kind_label = serializers.CharField(source="get_kind_display", read_only=True)
    category_label = serializers.CharField(source="get_category_display", read_only=True)
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = Feedback
        fields = [
            "id", "kind", "kind_label", "category", "category_label",
            "subject", "message", "bus", "bus_number",
            "author_name", "author_role", "is_anonymous",
            "status", "admin_note", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "kind", "category", "subject", "message", "bus",
            "author_role", "is_anonymous", "created_at", "updated_at",
        ]

    def get_author_name(self, obj):
        if obj.is_anonymous:
            return "Anonymous"
        return obj.author.username if obj.author else "Deleted account"
