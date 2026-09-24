from rest_framework import serializers
from .models import Sensor, ParkingEvent


class SensorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sensor
        fields = "__all__"


class ParkingEventSerializer(serializers.ModelSerializer):
    bus_number = serializers.CharField(source="bus.bus_number", read_only=True)
    slot_label = serializers.SerializerMethodField()

    class Meta:
        model = ParkingEvent
        fields = ["id", "bus", "bus_number", "sensor", "parking_slot",
                  "slot_label", "event_type", "message", "timestamp"]

    def get_slot_label(self, obj):
        if obj.parking_slot:
            return f"{obj.parking_slot.row}{obj.parking_slot.slot_number}"
        return None


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
