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
