from rest_framework import permissions, viewsets
from rest_framework.throttling import UserRateThrottle

from accounts.permissions import IsFullAdmin

from .models import Feedback
from .serializers import FeedbackAdminSerializer, FeedbackCreateSerializer

LIST_LIMIT = 500


class FeedbackSubmitThrottle(UserRateThrottle):
    """Stops one account flooding the inbox (rate set in settings: 'feedback')."""
    scope = "feedback"


class FeedbackViewSet(viewsets.ModelViewSet):
    """
    Complaints, feedback and suggestions.

    * POST   any signed-in user (student, transport staff, admin)
    * GET / PATCH / DELETE   administrators only

    Transport staff and students cannot read the inbox, not even their own
    submissions: the API answers 403.
    """

    queryset = Feedback.objects.select_related("bus", "author")
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_permissions(self):
        if self.action == "create":
            return [permissions.IsAuthenticated()]
        return [IsFullAdmin()]

    def get_throttles(self):
        return [FeedbackSubmitThrottle()] if self.action == "create" else []

    def get_serializer_class(self):
        return FeedbackCreateSerializer if self.action == "create" else FeedbackAdminSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action != "list":
            return qs
        params = self.request.query_params
        for field in ("status", "kind", "category"):
            value = params.get(field)
            if value:
                qs = qs.filter(**{field: value})
        return qs[:LIST_LIMIT]
