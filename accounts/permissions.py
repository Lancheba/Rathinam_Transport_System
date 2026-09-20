from rest_framework import permissions


def can_manage_buses(user):
    """
    True for people allowed to add, edit or remove buses:
    Django superusers / staff, and profiles with the ADMIN or STAFF role.

    Superusers are included on purpose: accounts created with
    `createsuperuser` get the default STUDENT profile role.
    """
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser or user.is_staff:
        return True
    profile = getattr(user, "profile", None)
    return bool(profile and profile.role in ("ADMIN", "STAFF"))


class CanManageBuses(permissions.BasePermission):
    message = "Only admins and transport staff can manage buses."

    def has_permission(self, request, view):
        return can_manage_buses(request.user)


def is_admin(user):
    """Full administrators: Django superusers and profiles with the ADMIN role."""
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    profile = getattr(user, "profile", None)
    return bool(profile and profile.role == "ADMIN")


def role_label(user):
    """Human-friendly role shown next to an announcement's author."""
    profile = getattr(user, "profile", None)
    if profile and profile.role == "STAFF" and not user.is_superuser:
        return "Transport Staff"
    if can_manage_buses(user):
        return "Administrator"
    return "Student"


def can_manage_announcement(user, announcement):
    """Admins can change any announcement; staff only the ones they posted."""
    if not can_manage_buses(user):
        return False
    return is_admin(user) or announcement.author_id == user.id


class CanPostAnnouncements(permissions.BasePermission):
    """Same people who manage buses (admins and transport staff) can post notices."""

    message = "Only admins and transport staff can post announcements."

    def has_permission(self, request, view):
        return can_manage_buses(request.user)

    def has_object_permission(self, request, view, obj):
        if can_manage_announcement(request.user, obj):
            return True
        self.message = "You can only change announcements you posted."
        return False
