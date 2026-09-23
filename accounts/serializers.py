from rest_framework import serializers
from django.contrib.auth.models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .permissions import can_manage_buses, is_admin


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ["username", "email", "password"]

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
    can_manage_buses = serializers.SerializerMethodField()
    is_admin = serializers.SerializerMethodField()
    driven_bus_number = serializers.SerializerMethodField()
    incharge_bus_number = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "role", "identity", "can_manage_buses", "is_admin", "driven_bus_number", "incharge_bus_number"]

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
            cab_number = (attrs.get("cab_number") or "").strip()
            if not cab_number:
                raise serializers.ValidationError({"cab_number": "Cab number is required for drivers."})
            bus = getattr(user, "driven_bus", None)
            if not bus:
                raise serializers.ValidationError({"cab_number": "You have not been assigned a bus yet. Contact admin."})
            if bus.bus_number.upper() != cab_number.upper():
                raise serializers.ValidationError({"cab_number": "Cab number does not match your assigned bus."})

        return data
