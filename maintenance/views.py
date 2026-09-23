from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from accounts.permissions import can_manage_buses
from attendance.permissions import driver_bus, is_driver
from .models import MaintenanceLog
from .permissions import CanManageOwnBusLogs
from .serializers import MaintenanceLogSerializer


class MaintenanceLogViewSet(viewsets.ModelViewSet):
    """
    Service and fuel history, keyed to a bus.

    A driver sees, adds, edits and deletes entries for their own bus only —
    get_queryset is what actually enforces that (a driver requesting another
    bus's entry by id just won't find it). Admins and transport staff can
    read every bus's history for fleet oversight, but not write to it here
    (see CanManageOwnBusLogs).
    """

    queryset = MaintenanceLog.objects.select_related("bus", "logged_by").all()
    serializer_class = MaintenanceLogSerializer
    permission_classes = [CanManageOwnBusLogs]
    filter_backends = [filters.SearchFilter]
    search_fields = ["notes", "bus__bus_number"]

    def _driver_only(self):
        return is_driver(self.request.user) and not can_manage_buses(self.request.user)

    def get_queryset(self):
        qs = super().get_queryset()
        if self._driver_only():
            bus = driver_bus(self.request.user)
            qs = qs.filter(bus=bus) if bus else qs.none()
        else:
            bus_id = self.request.query_params.get("bus")
            if bus_id:
                qs = qs.filter(bus_id=bus_id)

        log_type = self.request.query_params.get("log_type")
        if log_type:
            qs = qs.filter(log_type=log_type.upper())
        return qs

    def perform_create(self, serializer):
        # Only a driver ever reaches here — staff/admin POSTs are rejected by
        # CanManageOwnBusLogs before this point.
        bus = driver_bus(self.request.user)
        if not bus:
            raise ValidationError({"detail": "Link your bus before logging service or fuel entries."})
        serializer.save(bus=bus, logged_by=self.request.user)

    def perform_update(self, serializer):
        # Same as above: only the owning driver can reach an update, and they
        # can never move an entry onto a different bus.
        serializer.save(bus=driver_bus(self.request.user))

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        """
        The most recent SERVICE and most recent FUEL entry for a bus — the
        two headline numbers the "My Bus" page leads with. Scoped the same
        way as the list: a driver always gets their own bus; staff must
        pass ?bus=<id>.
        """
        if self._driver_only():
            bus = driver_bus(request.user)
            if not bus:
                return Response({"bus": None, "last_service": None, "last_fuel": None})
            bus_id = bus.id
        else:
            bus_id = request.query_params.get("bus")
            if not bus_id:
                return Response({"detail": "Provide ?bus=<id>."}, status=400)

        base = MaintenanceLog.objects.filter(bus_id=bus_id)
        last_service = base.filter(log_type=MaintenanceLog.SERVICE).first()
        last_fuel = base.filter(log_type=MaintenanceLog.FUEL).first()
        return Response({
            "bus": bus_id,
            "last_service": MaintenanceLogSerializer(last_service).data if last_service else None,
            "last_fuel": MaintenanceLogSerializer(last_fuel).data if last_fuel else None,
        })
