from rest_framework import permissions, viewsets
from accounts.permissions import CanPostAnnouncements
from .models import Announcement
from .serializers import AnnouncementSerializer

# The bell only needs recent notices; older ones stay reachable by id
LIST_LIMIT = 50


class AnnouncementViewSet(viewsets.ModelViewSet):
    """
    Anyone (including students who are not signed in) can read announcements.
    Only admins and transport staff can post them, and staff can only change or
    remove their own. Admins can change or remove any.
    """

    queryset = Announcement.objects.select_related("author")
    serializer_class = AnnouncementSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [permissions.AllowAny()]
        return [CanPostAnnouncements()]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action == "list":
            return qs[:LIST_LIMIT]
        return qs

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)
