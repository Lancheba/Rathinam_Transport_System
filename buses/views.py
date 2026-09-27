from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from accounts.permissions import CanManageBuses, can_manage_buses
from parking.models import recompute_blocked_slots
from .models import Bus
from .serializers import BusPublicSerializer, BusSerializer


class BusSearchFilter(filters.SearchFilter):
    """?search= may match the RFID UID for admins/staff only.

    Otherwise anyone could probe which UIDs exist by searching for them.
    """

    def get_search_fields(self, view, request):
        fields = list(super().get_search_fields(view, request))
        if not can_manage_buses(request.user):
            fields = [f for f in fields if f != "rfid_uid"]
        return fields


class BusViewSet(viewsets.ModelViewSet):
    queryset = Bus.objects.all().order_by("bus_number")
    serializer_class = BusSerializer
    filter_backends = [BusSearchFilter]
    search_fields = ["bus_number", "route", "rfid_uid"]

    def get_serializer_class(self):
        # Reads by anyone except admins/staff get the trimmed-down public view.
        if self.action in ("list", "retrieve", "search_by_number") and not can_manage_buses(self.request.user):
            return BusPublicSerializer
        return BusSerializer

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

    @action(detail=True, methods=["post"], url_path="assign-incharge")
    def assign_incharge(self, request, pk=None):
        """
        Make a student or teacher (an ordinary role=STUDENT login) the
        in-charge of this bus. If the bus already has an in-charge, that
        person is automatically demoted back to STUDENT first.
        """
        bus = self.get_object()
        source_type = (request.data.get("source_type") or "").strip().upper()
        source_id = request.data.get("source_id")

        if source_type not in ("STUDENT", "TEACHER"):
            return Response({"source_type": "Must be STUDENT or TEACHER."}, status=400)
        if not source_id:
            return Response({"source_id": "Provide the id of the student or teacher."}, status=400)

        if source_type == "STUDENT":
            from students.models import Student
            person = Student.objects.filter(pk=source_id).first()
        else:
            from attendance.models import Teacher
            person = Teacher.objects.filter(pk=source_id).first()

        if not person:
            return Response({"source_id": "Not found."}, status=404)

        user = person.linked_user
        if not user:
            return Response({"detail": "This person has no login account yet."}, status=400)

        profile = getattr(user, "profile", None)
        if not profile or profile.role != "STUDENT":
            return Response(
                {"detail": "Only an ordinary student/teacher account (role STUDENT) can be made in-charge."},
                status=400,
            )

        with transaction.atomic():
            old_incharge = bus.incharge
            if old_incharge and old_incharge.id != user.id:
                old_profile = getattr(old_incharge, "profile", None)
                if old_profile:
                    old_profile.role = "STUDENT"
                    old_profile.save(update_fields=["role"])

            # If this user is already in-charge of a different bus, free that bus first.
            Bus.objects.filter(incharge=user).exclude(pk=bus.pk).update(incharge=None)

            bus.incharge = user
            bus.save(update_fields=["incharge"])
            profile.role = "INCHARGE"
            profile.save(update_fields=["role"])

        return Response(BusSerializer(bus).data)

    @action(detail=True, methods=["post"], url_path="remove-incharge")
    def remove_incharge(self, request, pk=None):
        """Remove this bus's in-charge and revert their role back to STUDENT."""
        bus = self.get_object()
        user = bus.incharge
        if not user:
            return Response({"detail": "This bus has no in-charge assigned."}, status=400)

        with transaction.atomic():
            profile = getattr(user, "profile", None)
            if profile:
                profile.role = "STUDENT"
                profile.save(update_fields=["role"])
            bus.incharge = None
            bus.save(update_fields=["incharge"])

        return Response(BusSerializer(bus).data)
