from rest_framework import serializers
from .models import Bus


class BusSerializer(serializers.ModelSerializer):
    parking_slot_info = serializers.SerializerMethodField()

    class Meta:
        model = Bus
        fields = [
            "id", "bus_number", "rfid_uid", "route",
            "departure_time", "length_m", "width_m",
            "is_active", "parking_slot_info",
            "created_at", "updated_at",
        ]

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
