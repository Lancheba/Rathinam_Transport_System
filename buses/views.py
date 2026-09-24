from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from accounts.permissions import CanManageBuses
from parking.models import recompute_blocked_slots
from .models import Bus
from .serializers import BusSerializer


class BusViewSet(viewsets.ModelViewSet):
    queryset = Bus.objects.all().order_by("bus_number")
    serializer_class = BusSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["bus_number", "route", "rfid_uid"]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.AllowAny()]
        if self.action == "search_by_number":
            return [permissions.IsAuthenticated()]
        # create / update / partial_update / destroy
        return [CanManageBuses()]

    def perform_destroy(self, instance):
        # Free up the parking slot (if any) BEFORE the bus row disappears.
        # Bus.parking_slot -> ParkingSlot.bus is a OneToOne with on_delete=SET_NULL,
        # which would otherwise leave the slot marked is_occupied=True with bus=None.
        slot = getattr(instance, "parking_slot", None)
        if slot is not None:
            slot.is_occupied = False
            slot.is_blocked = False
            slot.bus = None
            slot.save(update_fields=["is_occupied", "is_blocked", "bus"])
        instance.delete()
        # A bus leaving might unblock others behind it in the same row
        recompute_blocked_slots()

    @action(detail=False, methods=["get"], url_path="search")
    def search_by_number(self, request):
        number = request.query_params.get("q", "").strip()
        if not number:
            return Response({"error": "Provide ?q=<bus_number>"}, status=400)
        try:
            bus = Bus.objects.get(bus_number__iexact=number)
        except Bus.DoesNotExist:
            return Response({"error": "Bus not found"}, status=404)
        serializer = self.get_serializer(bus)
        return Response(serializer.data)
