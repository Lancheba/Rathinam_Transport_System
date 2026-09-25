from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes
from accounts.permissions import CanManageBuses, HasDeviceKey
from rest_framework.response import Response
from .models import Sensor, ParkingEvent
from .serializers import SensorSerializer, ParkingEventSerializer, RFIDEventSerializer, OccupancyEventSerializer
from buses.models import Bus
from parking.services import assign_bus, free_slot, set_occupancy, SlotNotFound, SlotUnavailable


class SensorViewSet(viewsets.ModelViewSet):
    queryset = Sensor.objects.all()
    serializer_class = SensorSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.IsAuthenticated()]
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


def _touch_sensor(sensor_id_str, last_reading):
    """
    Look up a pre-registered sensor by its logical id and stamp last_reading
    / last_seen. Returns (sensor, error_response).

    Plan item 4.2: sensors are provisioned through the admin panel or the
    seed_sensors command now, not auto-created from whatever sensor_id an
    ESP32 happens to send -- an unknown id is a 404, not a phantom row.
    """
    if not sensor_id_str:
        return None, None
    try:
        sensor = Sensor.objects.get(sensor_id=sensor_id_str)
    except Sensor.DoesNotExist:
        return None, Response(
            {"error": f"Unknown sensor_id \"{sensor_id_str}\". Register it first."},
            status=status.HTTP_404_NOT_FOUND,
        )
    sensor.last_reading = last_reading
    sensor.last_seen = timezone.now()
    sensor.save(update_fields=["last_reading", "last_seen"])
    return sensor, None


def _last_gate_event(bus):
    return (
        ParkingEvent.objects.filter(bus=bus, event_type__in=("ENTRY", "EXIT"))
        .order_by("-timestamp")
        .first()
    )


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

    sensor, error = _touch_sensor(sensor_id_str, rfid_uid)
    if error:
        return error

    if event_type == "ENTRY":
        last = _last_gate_event(bus)
        if last is not None and last.event_type == "ENTRY":
            return Response(
                {"bus": bus.bus_number, "event_type": event_type, "slot": None, "duplicate": True},
                status=status.HTTP_200_OK,
            )
        from vision.linking import release_bus
        release_bus(bus)
        ParkingEvent.objects.create(
            bus=bus, sensor=sensor, event_type="ENTRY",
            message=f"RFID {rfid_uid} detected - ENTRY",
        )
        return Response({"bus": bus.bus_number, "event_type": event_type, "slot": None}, status=status.HTTP_200_OK)

    if event_type == "EXIT":
        from vision.linking import release_bus
        release_bus(bus)
        freed = free_slot(bus, sensor=sensor, event_type="EXIT")
        if not freed:
            ParkingEvent.objects.create(
                bus=bus, sensor=sensor, event_type="EXIT",
                message=f"RFID {rfid_uid} detected - EXIT",
            )
        return Response({"bus": bus.bus_number, "event_type": event_type, "slot": None}, status=status.HTTP_200_OK)

    try:
        slot = assign_bus(bus, sensor=sensor, event_type=event_type)
    except SlotUnavailable:
        slot = None

    if slot is None:
        ParkingEvent.objects.create(
            bus=bus, sensor=sensor, event_type=event_type,
            message=f"RFID {rfid_uid} detected - {event_type} (no free slot)",
        )
        return Response({"bus": bus.bus_number, "event_type": event_type, "slot": None}, status=status.HTTP_200_OK)

    return Response(
        {"bus": bus.bus_number, "event_type": event_type, "slot": f"{slot.row}{slot.slot_number}"},
        status=status.HTTP_200_OK,
    )


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

    sensor, error = _touch_sensor(sensor_id_str, "occupied" if is_occupied else "free")
    if error:
        return error

    if slot_id:
        try:
            set_occupancy(slot_id, is_occupied, sensor=sensor)
        except SlotNotFound:
            return Response(
                {"error": f"No parking slot with id {slot_id}"},
                status=status.HTTP_404_NOT_FOUND,
            )

    return Response({"status": "ok", "sensor": sensor_id_str, "occupied": is_occupied})
