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


def is_incharge(user):
    if not user or not user.is_authenticated:
        return False
    profile = getattr(user, "profile", None)
    return bool(profile and profile.role == "INCHARGE")


def incharge_bus(user):
    """The Bus this in-charge is linked to, or None."""
    return getattr(user, "incharge_bus", None)


class IsInCharge(permissions.BasePermission):
    message = "Only the cab in-charge can do this."

    def has_permission(self, request, view):
        return is_incharge(request.user)
