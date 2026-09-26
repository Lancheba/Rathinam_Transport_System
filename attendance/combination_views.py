from datetime import date as date_cls

from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from accounts.permissions import CanManageBuses
from attendance.models import CabCombination
from attendance.serializers import CabCombinationSerializer
from attendance.services import log_history


# GET  /api/attendance/combinations/  -> active combinations for ?date= (default: today)
# POST /api/attendance/combinations/  -> {"buses": [id, id, ...], "date": "YYYY-MM-DD", "reason": "..."}
# Staff/admin only.
@api_view(["GET", "POST"])
@permission_classes([CanManageBuses])
def combination_list_create(request):
    if request.method == "GET":
        day = request.query_params.get("date") or str(date_cls.today())
        qs = CabCombination.objects.filter(date=day, is_active=True).prefetch_related("buses")
        return Response(CabCombinationSerializer(qs, many=True).data)

    serializer = CabCombinationSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    combination = serializer.save(created_by=request.user)

    bus_numbers = ", ".join(combination.buses.values_list("bus_number", flat=True))
    for bus in combination.buses.all():
        log_history(
            "CABS_COMBINED", bus=bus, actor=request.user,
            description=(
                f"Bus {bus.bus_number} combined with {bus_numbers} for {combination.date}"
                + (f" -- {combination.reason}" if combination.reason else "")
            ),
            detail={"combination_id": combination.pk, "buses": bus_numbers, "date": str(combination.date)},
        )
    return Response(CabCombinationSerializer(combination).data, status=status.HTTP_201_CREATED)


# DELETE /api/attendance/combinations/<id>/  -> end a combination early. Staff/admin only.
@api_view(["DELETE"])
@permission_classes([CanManageBuses])
def combination_end(request, combination_id):
    try:
        combination = CabCombination.objects.get(pk=combination_id, is_active=True)
    except CabCombination.DoesNotExist:
        return Response({"detail": "Active combination not found."}, status=status.HTTP_404_NOT_FOUND)

    combination.is_active = False
    combination.ended_by = request.user
    combination.ended_at = timezone.now()
    combination.save(update_fields=["is_active", "ended_by", "ended_at"])

    bus_numbers = ", ".join(combination.buses.values_list("bus_number", flat=True))
    for bus in combination.buses.all():
        log_history(
            "COMBINATION_ENDED", bus=bus, actor=request.user,
            description=f"Combination ({bus_numbers}) ended early",
            detail={"combination_id": combination.pk, "buses": bus_numbers},
        )
    return Response({"detail": "Combination ended."})
