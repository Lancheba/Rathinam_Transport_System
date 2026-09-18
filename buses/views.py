from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
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
        return [permissions.IsAuthenticated()]

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
