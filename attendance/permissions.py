from rest_framework import permissions


def is_driver(user):
    if not user or not user.is_authenticated:
        return False
    profile = getattr(user, "profile", None)
    return bool(profile and profile.role == "DRIVER")


def driver_bus(user):
    """The Bus this driver is linked to, or None."""
    return getattr(user, "driven_bus", None)


class IsDriver(permissions.BasePermission):
    message = "Only drivers can do this."

    def has_permission(self, request, view):
        return is_driver(request.user)


from accounts.permissions import is_incharge  # single source of truth


def incharge_bus(user):
    """
    The Bus this in-charge is linked to: their permanent Bus.incharge link,
    or -- if none -- the bus they're standing in for today (Phase 5).
    """
    bus = getattr(user, "incharge_bus", None)
    if bus:
        return bus
    from django.utils import timezone
    from .models import TemporaryInchargeAssignment
    assignment = (
        TemporaryInchargeAssignment.objects
        .filter(stand_in=user, date=timezone.localdate(), is_active=True)
        .select_related("bus")
        .first()
    )
    return assignment.bus if assignment else None


class IsInCharge(permissions.BasePermission):
    message = "Only the cab in-charge can do this."

    def has_permission(self, request, view):
        return is_incharge(request.user)
