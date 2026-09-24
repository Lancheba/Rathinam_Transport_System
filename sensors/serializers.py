from rest_framework import serializers

from accounts.permissions import can_manage_buses

from .models import Sensor, ParkingEvent


def _viewer_is_staff(serializer):
    request = serializer.context.get("request")
    return bool(request and can_manage_buses(request.user))


class SensorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sensor
        fields = "__all__"

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # An RFID reader's last reading is a bus RFID UID: staff only.
        if instance.sensor_type == "RFID" and not _viewer_is_staff(self):
            data["last_reading"] = None
        return data


class ParkingEventSerializer(serializers.ModelSerializer):
    bus_number = serializers.CharField(source="bus.bus_number", read_only=True)
    slot_label = serializers.SerializerMethodField()
    message = serializers.SerializerMethodField()

    class Meta:
        model = ParkingEvent
        fields = ["id", "bus", "bus_number", "sensor", "parking_slot",
                  "slot_label", "event_type", "message", "timestamp"]

    def get_slot_label(self, obj):
        if obj.parking_slot:
            return f"{obj.parking_slot.row}{obj.parking_slot.slot_number}"
        return None

    def get_message(self, obj):
        # The stored message contains the RFID UID, so only staff see it.
        if _viewer_is_staff(self):
            return obj.message
        return f"{obj.bus.bus_number} - {obj.get_event_type_display()}"


class RFIDEventSerializer(serializers.Serializer):
    rfid_uid = serializers.CharField()
    sensor_id = serializers.CharField(required=False)
    event_type = serializers.ChoiceField(
        choices=["ENTRY", "EXIT", "DETECTED", "MOVED", "PARKED"],
        default="DETECTED"
    )


class OccupancyEventSerializer(serializers.Serializer):
    sensor_id = serializers.CharField()
    is_occupied = serializers.BooleanField()
    slot_id = serializers.IntegerField(required=False)
