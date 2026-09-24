from rest_framework import serializers
from .models import OptimizationResult


class OptimizationResultSerializer(serializers.ModelSerializer):
    layout = serializers.SerializerMethodField()

    class Meta:
        model = OptimizationResult
        fields = ["id", "created_at", "blocked_before", "blocked_after",
                  "movements_required", "layout"]

    def get_layout(self, obj):
        return obj.get_layout()
