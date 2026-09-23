from rest_framework import serializers
from .models import Student


class StudentSerializer(serializers.ModelSerializer):
    bus_number = serializers.CharField(source="bus.bus_number", read_only=True, allow_null=True)
    bus_route = serializers.CharField(source="bus.route", read_only=True, allow_null=True)

    class Meta:
        model = Student
        fields = [
            "id", "name", "roll_number", "department", "year",
            "phone", "email", "boarding_point",
            "bus", "bus_number", "bus_route",
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


class StudentBriefSerializer(serializers.ModelSerializer):
    """Compact shape used inside the per-bus roster response."""

    class Meta:
        model = Student
        fields = ["id", "name", "roll_number", "department", "year", "phone", "boarding_point"]


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
