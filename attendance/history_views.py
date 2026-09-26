from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from accounts.permissions import CanManageBuses
from attendance.models import HistoryEvent
from attendance.serializers import HistoryEventSerializer


# GET /api/attendance/history/
# Reverse-chronological feed of HistoryEvent rows. Staff and admins only.
# Optional filters: ?bus=<id>  ?event_type=<CODE>  ?date=YYYY-MM-DD
@api_view(["GET"])
@permission_classes([CanManageBuses])
def history_feed(request):
    qs = HistoryEvent.objects.select_related("bus", "actor")

    bus_id = request.query_params.get("bus")
    if bus_id:
        qs = qs.filter(bus_id=bus_id)

    event_type = (request.query_params.get("event_type") or "").strip().upper()
    if event_type:
        qs = qs.filter(event_type=event_type)

    date_str = request.query_params.get("date")
    if date_str:
        qs = qs.filter(created_at__date=date_str)

    return Response(HistoryEventSerializer(qs[:200], many=True).data)
