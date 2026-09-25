import re

from rest_framework import serializers
from django.contrib.auth.models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .permissions import can_manage_buses, is_admin

PHONE_RE = re.compile(r"^\+?[0-9][0-9\s\-]{6,19}$")


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = ["username", "email", "password"]

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate_password(self, value):
        from django.contrib.auth.password_validation import validate_password
        validate_password(value)
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    identity = serializers.CharField(source="profile.identity", read_only=True)
    role = serializers.CharField(source="profile.role", read_only=True)
    phone = serializers.CharField(source="profile.phone", read_only=True)
    can_manage_buses = serializers.SerializerMethodField()
    is_admin = serializers.SerializerMethodField()
    driven_bus_number = serializers.SerializerMethodField()
    incharge_bus_number = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "role", "identity", "phone", "can_manage_buses", "is_admin", "driven_bus_number", "incharge_bus_number"]

    def get_can_manage_buses(self, obj):
        return can_manage_buses(obj)

    def get_is_admin(self, obj):
        return is_admin(obj)

    def get_driven_bus_number(self, obj):
        bus = getattr(obj, "driven_bus", None)
        return bus.bus_number if bus else None

    def get_incharge_bus_number(self, obj):
        bus = getattr(obj, "incharge_bus", None)
        return bus.bus_number if bus else None


class UpdatePhoneSerializer(serializers.Serializer):
    """item 2.9 / Step 4: lets a signed-in user set their own contact number."""

    phone = serializers.CharField(allow_blank=True, max_length=20)

    def validate_phone(self, value):
        value = value.strip()
        if value and not PHONE_RE.match(value):
            raise serializers.ValidationError("Enter a valid phone number.")
        return value

    def save(self, **kwargs):
        user = self.context["request"].user
        profile = user.profile
        profile.phone = self.validated_data["phone"]
        profile.save(update_fields=["phone"])
        return profile


class SetIdentitySerializer(serializers.Serializer):
    identity = serializers.ChoiceField(choices=["STUDENT", "TEACHER"])

    def save(self, **kwargs):
        user = self.context["request"].user
        profile = user.profile
        profile.identity = self.validated_data["identity"]
        profile.save(update_fields=["identity"])
        return profile


class DriverLoginSerializer(TokenObtainPairSerializer):
    cab_number = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        profile = getattr(user, "profile", None)

        if profile and profile.role == "DRIVER":
            # item 2.9: a driver with no bus yet must still be able to log in,
            # so they can reach the My Bus screen and claim one. Once a bus IS
            # assigned, the cab number is checked as a sanity confirmation.
            bus = getattr(user, "driven_bus", None)
            if bus:
                cab_number = (attrs.get("cab_number") or "").strip()
                if not cab_number:
                    raise serializers.ValidationError({"cab_number": "Cab number is required for drivers."})
                if bus.bus_number.upper() != cab_number.upper():
                    raise serializers.ValidationError({"cab_number": "Cab number does not match your assigned bus."})

        return data


# --- Link requests (audit items 2.9 / 3.1) -------------------------------------------------
from .models import LinkRequest  # noqa: E402


class LinkRequestSerializer(serializers.ModelSerializer):
    """
    One link request.

    Staff see the full teacher record. The person who filed the request (context
    `own=True`) only gets the staff ID back while it is pending, so nobody can
    turn the request form into a staff-ID -> name lookup.
    """

    user = serializers.SerializerMethodField()
    teacher = serializers.SerializerMethodField()
    bus = serializers.SerializerMethodField()
    decided_by = serializers.SerializerMethodField()
    created_at = serializers.SerializerMethodField()

    class Meta:
        model = LinkRequest
        fields = [
            "id", "kind", "status", "user", "teacher", "bus",
            "decided_by", "decided_at", "decision_note", "created_at",
        ]

    def get_user(self, obj):
        return {"id": obj.user_id, "username": obj.user.username}

    def get_teacher(self, obj):
        t = obj.teacher
        if t is None:
            return None
        if self.context.get("own") and obj.status != LinkRequest.APPROVED:
            return {"staff_id": t.staff_id}
        return {"id": t.id, "staff_id": t.staff_id, "name": t.name, "department": t.department}

    def get_bus(self, obj):
        b = obj.bus
        return None if b is None else {"id": b.id, "bus_number": b.bus_number, "route": b.route}

    def get_decided_by(self, obj):
        return obj.decided_by.username if obj.decided_by_id else None

    def get_created_at(self, obj):
        value = getattr(obj, "created_at", None)
        return value.isoformat() if value else None


class TeacherLinkRequestInputSerializer(serializers.Serializer):
    # A blank value is allowed here on purpose: linking.py owns the "Enter your staff ID." message.
    staff_id = serializers.CharField(max_length=30, allow_blank=True)


class DecisionInputSerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True, max_length=200)
