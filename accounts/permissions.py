from django.utils import timezone
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


class IsFullAdmin(permissions.BasePermission):
    """Administrators only (superusers and the ADMIN role). Transport staff are NOT included."""

    message = "Only administrators can view complaints and feedback."

    def has_permission(self, request, view):
        return is_admin(request.user)


def is_student(user):
    """
    True for ordinary STUDENT-role accounts only — not admins, staff, drivers,
    or superusers (who default to the STUDENT profile role too, per
    can_manage_buses' note above).
    """
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser or user.is_staff:
        return False
    profile = getattr(user, "profile", None)
    if not profile or profile.role != "STUDENT":
        return False
    return True


def role_label(user):
    """Human-friendly role shown next to an announcement's author."""
    profile = getattr(user, "profile", None)
    if profile and profile.role == "STAFF" and not user.is_superuser:
        return "Transport Staff"
    if can_manage_buses(user):
        return "Administrator"
    if profile and profile.role == "INCHARGE":
        return "Cab In-Charge"
    if profile and profile.role == "DRIVER":
        return "Driver"
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



class IsStudent(permissions.BasePermission):
    message = "Only students can do this."

    def has_permission(self, request, view):
        return is_student(request.user)


def is_incharge(user):
    """True for accounts tagged as Cab In-Charge (the INCHARGE role)."""
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser or user.is_staff:
        return False
    profile = getattr(user, "profile", None)
    return bool(profile and profile.role == "INCHARGE")


class IsCabInCharge(permissions.BasePermission):
    message = "Only the cab in-charge can do this."

    def has_permission(self, request, view):
        return is_incharge(request.user)


class HasDeviceKey(permissions.BasePermission):
    """
    For hardware (ESP32 readers, ultrasonic nodes, the camera script) that has
    no user account. The device sends its own key, "<key_id>.<secret>", in
    X-Device-Key. Looked up against accounts.Device -- plan item 7.1:
    revoking one device (is_active=False) stops only that device.
    """

    message = "Missing or invalid device key."

    def has_permission(self, request, view):
        from accounts.models import Device  # local import avoids an app-loading order issue

        supplied = request.headers.get("X-Device-Key", "")
        key_id, sep, secret = supplied.partition(".")
        if not sep:
            return False
        try:
            device = Device.objects.get(key_id=key_id, is_active=True)
        except Device.DoesNotExist:
            return False
        if not device.check_secret(secret):
            return False
        request.device = device
        Device.objects.filter(pk=device.pk).update(last_used_at=timezone.now())
        return True
