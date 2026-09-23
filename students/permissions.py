from rest_framework import permissions

from accounts.permissions import can_manage_buses
from attendance.permissions import is_driver


class CanManageOwnBusStudents(permissions.BasePermission):
    """
    Admins and transport staff can list, add, edit and delete every student
    (via can_manage_buses).

    Drivers can do the same, but only for their own bus's roster. This class
    only grants the general "are you allowed to touch this endpoint at all"
    check; the actual "own bus only" boundary is enforced in
    StudentViewSet.get_queryset / perform_create / perform_update, since
    that's what controls which rows a driver can see or reach by id at all.
    """

    message = "Only admins, transport staff, or the bus's own driver can manage students."

    def has_permission(self, request, view):
        if can_manage_buses(request.user):
            return True
        return is_driver(request.user)
