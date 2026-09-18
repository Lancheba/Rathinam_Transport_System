from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import Sensor, ParkingEvent
from .serializers import SensorSerializer, ParkingEventSerializer, RFIDEventSerializer, OccupancyEventSerializer
from buses.models import Bus
from parking.models import ParkingSlot


class SensorViewSet(viewsets.ModelViewSet):
    queryset = Sensor.objects.all()
    serializer_class = SensorSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]


class ParkingEventViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ParkingEvent.objects.select_related("bus", "sensor", "parking_slot").order_by("-timestamp")
    serializer_class = ParkingEventSerializer
    permission_classes = [permissions.AllowAny]

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
@permission_classes([permissions.AllowAny])
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
            _recompute_blocked()

    elif event_type == "EXIT":
        ParkingSlot.objects.filter(bus=bus).update(is_occupied=False, bus=None, is_blocked=False)
        _recompute_blocked()

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
@permission_classes([permissions.AllowAny])
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
            _recompute_blocked()
        except ParkingSlot.DoesNotExist:
            pass

    return Response({"status": "ok", "sensor": sensor_id_str, "occupied": is_occupied})


def _recompute_blocked():
    """
    Mark a bus as blocked if there is another bus in a slot with a lower
    slot_number in the same row (i.e. closer to the exit).
    Row A slot 1 is closest to exit.
    """
    for slot in ParkingSlot.objects.filter(is_occupied=True).select_related("bus"):
        blocking = ParkingSlot.objects.filter(
            row=slot.row,
            is_occupied=True,
            slot_number__lt=slot.slot_number,
        ).exists()
        slot.is_blocked = blocking
        slot.save(update_fields=["is_blocked"])
