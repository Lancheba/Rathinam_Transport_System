from rest_framework import serializers

from .models import MaintenanceLog


class MaintenanceLogSerializer(serializers.ModelSerializer):
    bus_number = serializers.CharField(source="bus.bus_number", read_only=True)
    logged_by_username = serializers.CharField(source="logged_by.username", read_only=True, allow_null=True)

    class Meta:
        model = MaintenanceLog
        fields = [
            "id", "bus", "bus_number", "log_type", "date",
            "odometer_km", "cost", "fuel_liters", "notes",
            "logged_by_username", "created_at", "updated_at",
        ]
        # A driver's `bus` is forced server-side (see MaintenanceLogViewSet), so it's
        # never actually required from the client, but keeping it required=False here
        # (rather than read-only) still lets staff pick a bus when logging on someone's behalf.
        extra_kwargs = {"bus": {"required": False}}

    def validate(self, attrs):
        log_type = attrs.get("log_type", getattr(self.instance, "log_type", None))
        if log_type != MaintenanceLog.FUEL:
            # Fuel volume only makes sense for a refuel entry — don't carry it on a service row.
            attrs["fuel_liters"] = None
        return attrs

    def validate_date(self, value):
        from django.utils import timezone
        if value > timezone.localdate():
            raise serializers.ValidationError("The date can't be in the future.")
        return value
