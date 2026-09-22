from rest_framework import serializers
from .models import Bus


class BusSerializer(serializers.ModelSerializer):
    parking_slot_info = serializers.SerializerMethodField()
    driver_username = serializers.CharField(source="driver.username", read_only=True, allow_null=True)

    # Bus dimensions are stored as DecimalField(5, 2): reject zero/negative values
    length_m = serializers.DecimalField(max_digits=5, decimal_places=2, min_value=1)
    width_m = serializers.DecimalField(max_digits=5, decimal_places=2, min_value=1)

    class Meta:
        model = Bus
        fields = [
            "id", "bus_number", "rfid_uid", "route",
            "departure_time", "length_m", "width_m",
            "is_active", "parking_slot_info",
            "driver_username", "student_capacity", "teacher_capacity",
            "created_at", "updated_at",
        ]
        # Uniqueness is checked in validate_bus_number / validate_rfid_uid
        # so the messages are friendlier (and the bus number check ignores case).
        extra_kwargs = {
            "bus_number": {"validators": []},
            "rfid_uid": {"validators": []},
        }

    def validate_bus_number(self, value):
        # "b09 " and "B09" are the same bus
        value = value.strip().upper()
        if not value:
            raise serializers.ValidationError("Enter a bus number.")
        clash = Bus.objects.filter(bus_number__iexact=value)
        if self.instance:
            clash = clash.exclude(pk=self.instance.pk)
        if clash.exists():
            raise serializers.ValidationError("A bus with this number already exists.")
        return value

    def validate_rfid_uid(self, value):
        # Only trim: sensors match the RFID UID exactly, so don't change its case.
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Enter the RFID UID.")
        clash = Bus.objects.filter(rfid_uid=value)
        if self.instance:
            clash = clash.exclude(pk=self.instance.pk)
        if clash.exists():
            raise serializers.ValidationError("This RFID tag is already assigned to another bus.")
        return value

    def validate_route(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Enter the route.")
        return value

    def get_parking_slot_info(self, obj):
        try:
            slot = obj.parking_slot
            return {
                "row": slot.row,
                "slot_number": slot.slot_number,
                "is_blocked": slot.is_blocked,
            }
        except Exception:
            return None
