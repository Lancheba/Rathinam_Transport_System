from rest_framework import permissions

from accounts.permissions import can_manage_buses
from attendance.permissions import is_driver


class CanManageOwnBusLogs(permissions.BasePermission):
    """
    A driver can list, add, edit and delete service/fuel log entries — but
    only for their own bus (the actual "own bus only" boundary is enforced
    in the view's get_queryset/perform_create/perform_update, same as
    students.permissions.CanManageOwnBusStudents).

    Admins and transport staff can see every bus's history for fleet
    oversight, but read-only: logging an entry is the driver's job, staff
    don't edit or delete someone else's records here.
    """

    message = "Only a bus's own driver can add or change its service/fuel log."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if can_manage_buses(user):
            return request.method in permissions.SAFE_METHODS
        return is_driver(user)
