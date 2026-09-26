from rest_framework import serializers

from accounts.permissions import can_manage_buses
from attendance.permissions import is_incharge
from .models import Student


class FaceStatusMixin(serializers.Serializer):
    """
    Adds face_enrolled / face_enrolled_at to a Student serializer.

    Resolved only for admins, transport staff, and cab in-charges — a driver
    (or anyone else) gets null for both fields, since face-enrollment status
    isn't part of what a driver needs to see about a roster.
    """

    face_enrolled = serializers.SerializerMethodField()
    face_enrolled_at = serializers.SerializerMethodField()

    def _can_see_face_status(self):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user:
            return False
        return can_manage_buses(user) or is_incharge(user)

    def get_face_enrolled(self, obj):
        if not self._can_see_face_status():
            return None
        return hasattr(obj, "face_profile")

    def get_face_enrolled_at(self, obj):
        if not self._can_see_face_status():
            return None
        profile = getattr(obj, "face_profile", None)
        return profile.enrolled_at if profile else None


class StudentSerializer(FaceStatusMixin, serializers.ModelSerializer):
    bus_number = serializers.CharField(source="bus.bus_number", read_only=True, allow_null=True)
    bus_route = serializers.CharField(source="bus.route", read_only=True, allow_null=True)

    class Meta:
        model = Student
        fields = [
            "id", "name", "roll_number", "department", "year",
            "phone", "email", "boarding_point",
            "bus", "bus_number", "bus_route",
            "face_enrolled", "face_enrolled_at",
            "created_at", "updated_at",
        ]
        extra_kwargs = {
            "roll_number": {"validators": []},  # friendlier message via validate_roll_number
        }

    def validate_roll_number(self, value):
        value = value.strip().upper()
        if not value:
            raise serializers.ValidationError("Enter a roll number.")
        clash = Student.objects.filter(roll_number__iexact=value)
        if self.instance:
            clash = clash.exclude(pk=self.instance.pk)
        if clash.exists():
            raise serializers.ValidationError("A student with this roll number already exists.")
        return value

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Enter the student's name.")
        return value


class StudentBriefSerializer(FaceStatusMixin, serializers.ModelSerializer):
    """Compact shape used inside the per-bus roster response."""

    class Meta:
        model = Student
        fields = [
            "id", "name", "roll_number", "department", "year", "phone", "boarding_point",
            "face_enrolled", "face_enrolled_at",
        ]


class StudentSelfSerializer(serializers.ModelSerializer):
    """
    What a STUDENT-role account sees about *their own* linked roster row —
    just enough to confirm who they're linked as and which bus, none of the
    admin-facing detail (no other student's data ever reaches this shape).
    """

    bus_number = serializers.CharField(source="bus.bus_number", read_only=True, allow_null=True)

    class Meta:
        model = Student
        fields = ["id", "name", "roll_number", "department", "year", "bus_number", "boarding_point"]

