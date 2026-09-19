from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile
from .permissions import can_manage_buses


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    role = serializers.ChoiceField(choices=UserProfile.ROLES, default="STUDENT")

    class Meta:
        model = User
        fields = ["username", "email", "password", "role"]

    def create(self, validated_data):
        role = validated_data.pop("role", "STUDENT")
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
        )
        user.profile.role = role
        user.profile.save()
        return user


class UserSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source="profile.role", read_only=True)
    can_manage_buses = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "role", "can_manage_buses"]

    def get_can_manage_buses(self, obj):
        return can_manage_buses(obj)
