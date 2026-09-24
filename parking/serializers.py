from rest_framework import serializers
from .models import ParkingGround, ParkingSlot


class ParkingGroundSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParkingGround
        fields = "__all__"


class ParkingSlotSerializer(serializers.ModelSerializer):
    bus_number = serializers.CharField(source="bus.bus_number", read_only=True, allow_null=True)
    bus_departure = serializers.TimeField(source="bus.departure_time", read_only=True, allow_null=True)
    bus_route = serializers.CharField(source="bus.route", read_only=True, allow_null=True)

    class Meta:
        model = ParkingSlot
        fields = [
            "id", "ground", "row", "slot_number",
            "x_position_m", "y_position_m",
            "is_occupied", "is_blocked",
            "bus", "bus_number", "bus_departure", "bus_route",
        ]
