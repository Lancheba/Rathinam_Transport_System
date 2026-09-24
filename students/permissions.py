from rest_framework import permissions

from accounts.permissions import can_manage_buses
from attendance.permissions import is_driver


class CanManageOwnBusStudents(permissions.BasePermission):
    """
    Admins and transport staff can list, add, edit and delete every student
    (via can_manage_buses).

    Drivers can only view their own bus's roster (read-only) - this class
    restricts them to SAFE_METHODS. The actual "own bus only" boundary for
    that read access is enforced in StudentViewSet.get_queryset, since
    that's what controls which rows a driver can see or reach by id at all.
    """

    message = "Only admins and transport staff can manage students; drivers have read-only access to their own bus."

    def has_permission(self, request, view):
        if can_manage_buses(request.user):
            return True
        if is_driver(request.user):
            return request.method in permissions.SAFE_METHODS
        return False
