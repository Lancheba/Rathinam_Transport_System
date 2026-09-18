from django.db import models
import json


class OptimizationResult(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    blocked_before = models.IntegerField(default=0)
    blocked_after = models.IntegerField(default=0)
    movements_required = models.IntegerField(default=0)
    layout_json = models.TextField(default="{}")

    def get_layout(self):
        return json.loads(self.layout_json)

    def set_layout(self, data):
        self.layout_json = json.dumps(data)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Optimization #{self.pk} — blocked: {self.blocked_before}→{self.blocked_after}"
