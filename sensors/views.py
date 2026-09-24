from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes
from accounts.permissions import CanManageBuses, HasDeviceKey
from rest_framework.response import Response
from .models import Sensor, ParkingEvent
from .serializers import SensorSerializer, ParkingEventSerializer, RFIDEventSerializer, OccupancyEventSerializer
from buses.models import Bus
from parking.models import ParkingSlot, recompute_blocked_slots


class SensorViewSet(viewsets.ModelViewSet):
    queryset = Sensor.objects.all()
    serializer_class = SensorSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.IsAuthenticated()]
        # create / update / partial_update / destroy require ADMIN or STAFF
        return [CanManageBuses()]


class ParkingEventViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ParkingEvent.objects.select_related("bus", "sensor", "parking_slot").order_by("-timestamp")
    serializer_class = ParkingEventSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        bus_id = self.request.query_params.get("bus")
        limit = self.request.query_params.get("limit")
        if bus_id:
            qs = qs.filter(bus_id=bus_id)
        if limit:
            try:
                qs = qs[: int(limit)]
            except ValueError:
                pass
        return qs


@api_view(["POST"])
@permission_classes([HasDeviceKey])
def rfid_event(request):
    """Receives RFID detection from ESP32 or simulation."""
    ser = RFIDEventSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    rfid_uid = ser.validated_data["rfid_uid"]
    event_type = ser.validated_data.get("event_type", "DETECTED")
    sensor_id_str = ser.validated_data.get("sensor_id")

    try:
        bus = Bus.objects.get(rfid_uid=rfid_uid)
    except Bus.DoesNotExist:
        return Response({"error": f"No bus found with RFID UID: {rfid_uid}"}, status=404)

    sensor = None
    if sensor_id_str:
        sensor, _ = Sensor.objects.get_or_create(
            sensor_id=sensor_id_str,
            defaults={"sensor_type": "RFID", "location": "Unknown"},
        )
        sensor.last_reading = rfid_uid
        sensor.last_seen = timezone.now()
        sensor.save()

    # An ENTRY means the bus is arriving, an EXIT that it left: either way any
    # old camera identity / slot for this bus is stale.
    if event_type in ("ENTRY", "EXIT"):
        from vision.linking import release_bus
        release_bus(bus)

    # Assign bus to slot if PARKED or DETECTED
    slot = None
    if event_type in ("PARKED", "DETECTED"):
        # Find first free slot
        slot = ParkingSlot.objects.filter(is_occupied=False, bus__isnull=True).order_by("row", "slot_number").first()
        if slot:
            # Clear previous slot
            ParkingSlot.objects.filter(bus=bus).update(is_occupied=False, bus=None, is_blocked=False)
            slot.bus = bus
            slot.is_occupied = True
            slot.save()
            # Recompute blocked status: slots behind this one in same row
            recompute_blocked_slots()

    elif event_type == "EXIT":
        ParkingSlot.objects.filter(bus=bus).update(is_occupied=False, bus=None, is_blocked=False)
        recompute_blocked_slots()

    ParkingEvent.objects.create(
        bus=bus,
        sensor=sensor,
        parking_slot=slot,
        event_type=event_type,
        message=f"RFID {rfid_uid} detected — {event_type}",
    )

    return Response({
        "bus": bus.bus_number,
        "event_type": event_type,
        "slot": f"{slot.row}{slot.slot_number}" if slot else None,
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([HasDeviceKey])
def occupancy_event(request):
    """Receives ultrasonic sensor data from ESP32 or simulation."""
    ser = OccupancyEventSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    sensor_id_str = ser.validated_data["sensor_id"]
    is_occupied = ser.validated_data["is_occupied"]
    slot_id = ser.validated_data.get("slot_id")

    sensor, _ = Sensor.objects.get_or_create(
        sensor_id=sensor_id_str,
        defaults={"sensor_type": "ULTRASONIC", "location": "Unknown"},
    )
    sensor.last_reading = "occupied" if is_occupied else "free"
    sensor.last_seen = timezone.now()
    sensor.save()

    if slot_id:
        try:
            slot = ParkingSlot.objects.get(pk=slot_id)
            slot.is_occupied = is_occupied
            if not is_occupied:
                slot.bus = None
                slot.is_blocked = False
            slot.save()
            recompute_blocked_slots()
        except ParkingSlot.DoesNotExist:
            pass

    return Response({"status": "ok", "sensor": sensor_id_str, "occupied": is_occupied})



