from rest_framework import serializers
from django.contrib.auth.models import User
from .permissions import can_manage_buses


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ["username", "email", "password"]

    def create(self, validated_data):
        # Public sign-up always creates a STUDENT (the profile default).
        # Admin and transport-staff roles are granted only from the admin site.
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source="profile.role", read_only=True)
    can_manage_buses = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "role", "can_manage_buses"]

    def get_can_manage_buses(self, obj):
        return can_manage_buses(obj)
