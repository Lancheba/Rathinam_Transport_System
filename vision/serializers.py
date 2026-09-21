from rest_framework import serializers

from .models import VisionTrack


class DetectionSerializer(serializers.Serializer):
    track_id = serializers.IntegerField(min_value=0)
    x_m = serializers.FloatField()
    y_m = serializers.FloatField()
    confidence = serializers.FloatField(required=False, default=1.0, min_value=0, max_value=1)


class FrameSerializer(serializers.Serializer):
    camera_id = serializers.CharField(max_length=50)
    session = serializers.CharField(max_length=40, required=False, default="default")
    detections = DetectionSerializer(many=True)

    def validate_detections(self, value):
        ids = [d["track_id"] for d in value]
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError("Each track_id may appear only once per frame.")
        return value


class VisionTrackSerializer(serializers.ModelSerializer):
    bus_number = serializers.CharField(source="bus.bus_number", read_only=True, default=None)
    slot_label = serializers.SerializerMethodField()

    class Meta:
        model = VisionTrack
        fields = [
            "id", "camera_id", "track_id", "bus", "bus_number",
            "slot", "slot_label", "x_m", "y_m", "confidence",
            "frames_seen", "is_active", "first_seen", "last_seen",
        ]

    def get_slot_label(self, obj):
        if obj.slot_id:
            return f"{obj.slot.row}{obj.slot.slot_number}"
        return None
