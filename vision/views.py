from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from accounts.permissions import CanManageBuses, HasDeviceKey
from buses.models import Bus

from .linking import assign_track, process_frame
from .models import VisionTrack
from .serializers import FrameSerializer, VisionTrackSerializer


@api_view(["POST"])
@permission_classes([HasDeviceKey])
def positions(request):
    """
    Receives one batch of camera detections from edge/vision_tracker.py.

    Body: {"camera_id": "CAM-1", "session": "20260920101500",
           "detections": [{"track_id": 3, "x_m": 12.4, "y_m": 8.1, "confidence": 0.91}]}
    x_m / y_m are ground coordinates in metres (same axes as ParkingSlot).
    """
    ser = FrameSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    summary = process_frame(
        ser.validated_data["camera_id"],
        ser.validated_data["session"],
        ser.validated_data["detections"],
    )
    return Response(summary)


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def track_list(request):
    """Vehicles the camera currently follows (newest first)."""
    qs = VisionTrack.objects.filter(is_active=True).select_related("bus", "slot")
    return Response(VisionTrackSerializer(qs, many=True).data)


@api_view(["POST"])
@permission_classes([CanManageBuses])
def track_assign(request, pk):
    """Staff fix: tell the system which bus a camera track really is."""
    track = get_object_or_404(VisionTrack, pk=pk)
    bus_id = request.data.get("bus_id")
    if not bus_id:
        return Response({"error": "bus_id required"}, status=400)
    bus = get_object_or_404(Bus, pk=bus_id)
    assign_track(track, bus)
    return Response(VisionTrackSerializer(track).data)
