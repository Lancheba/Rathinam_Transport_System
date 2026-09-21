import json
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from config.throttles import OptimizeThrottle
from rest_framework import status
from accounts.permissions import CanManageBuses
from rest_framework.response import Response
from .engine import run_optimization, apply_optimization
from .models import OptimizationResult
from .serializers import OptimizationResultSerializer


@api_view(["POST"])
@permission_classes([CanManageBuses])
@throttle_classes([OptimizeThrottle])
def run_optimization_view(request):
    """Run optimisation and save the result (does not apply it)."""
    result = run_optimization()

    opt = OptimizationResult(
        blocked_before=result["stats"]["blocked_before"],
        blocked_after=result["stats"]["blocked_after"],
        movements_required=result["stats"]["movements_required"],
    )
    opt.set_layout(result)
    opt.save()

    # Keep only the 50 most recent previews so the table cannot grow without limit.
    stale = list(OptimizationResult.objects.order_by("-id").values_list("id", flat=True)[50:])
    if stale:
        OptimizationResult.objects.filter(id__in=stale).delete()

    return Response({
        "id": opt.pk,
        "stats": result["stats"],
        "current": result["current"],
        "recommended": result["recommended"],
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([CanManageBuses])
def apply_optimization_view(request):
    """Apply a previously computed optimisation result to the database."""
    result_id = request.data.get("result_id")
    if not result_id:
        return Response({"error": "result_id required"}, status=400)
    try:
        opt = OptimizationResult.objects.get(pk=result_id)
    except OptimizationResult.DoesNotExist:
        return Response({"error": "Result not found"}, status=404)

    layout_data = opt.get_layout()
    apply_optimization(layout_data.get("recommended", []))
    return Response({"status": "applied", "result_id": opt.pk})


@api_view(["GET"])
@permission_classes([CanManageBuses])
def optimization_results(request):
    results = OptimizationResult.objects.all()[:10]
    serializer = OptimizationResultSerializer(results, many=True)
    return Response(serializer.data)
