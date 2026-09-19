from rest_framework import viewsets, permissions, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import ParkingGround, ParkingSlot
from .serializers import ParkingGroundSerializer, ParkingSlotSerializer


class ParkingGroundViewSet(viewsets.ModelViewSet):
    queryset = ParkingGround.objects.all()
    serializer_class = ParkingGroundSerializer
    permission_classes = [permissions.AllowAny]
    http_method_names = ["get", "post", "put", "patch", "head", "options"]


class ParkingSlotViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ParkingSlot.objects.select_related("bus", "ground").all()
    serializer_class = ParkingSlotSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = super().get_queryset()
        row = self.request.query_params.get("row")
        occupied = self.request.query_params.get("occupied")
        blocked = self.request.query_params.get("blocked")
        if row:
            qs = qs.filter(row=row.upper())
        if occupied is not None:
            qs = qs.filter(is_occupied=occupied.lower() == "true")
        if blocked is not None:
            qs = qs.filter(is_blocked=blocked.lower() == "true")
        return qs.order_by("row", "slot_number")


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def parking_summary(request):
    total = ParkingSlot.objects.count()
    occupied = ParkingSlot.objects.filter(is_occupied=True).count()
    blocked = ParkingSlot.objects.filter(is_blocked=True).count()
    free = total - occupied
    return Response({
        "total_slots": total,
        "occupied": occupied,
        "free": free,
        "blocked": blocked,
        "utilisation_pct": round((occupied / total * 100) if total else 0, 1),
    })
