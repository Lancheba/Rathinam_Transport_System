"""
Approval-based linking (audit item 2.9 / 3.1).

A user never links themselves. They ask (request_*), staff decide
(approve / reject). Every write happens inside transaction.atomic with the
rows locked, so two people asking for the same teacher or bus cannot both win.
"""
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import PermissionDenied
from django.db import IntegrityError, transaction
from django.utils import timezone

from attendance.models import Teacher
from buses.models import Bus

from .models import LinkRequest
from .permissions import can_manage_buses


class LinkError(Exception):
    """A request that cannot be made or approved. str(error) is safe to show the user."""


def _cancel_own_pending(user, kind):
    LinkRequest.objects.filter(user=user, kind=kind, status=LinkRequest.PENDING).update(
        status=LinkRequest.CANCELLED, decided_at=timezone.now(),
        decision_note="Replaced by a newer request.",
    )


def _reject_rivals(lr, note):
    rivals = LinkRequest.objects.filter(status=LinkRequest.PENDING, kind=lr.kind)
    rivals = rivals.filter(teacher_id=lr.teacher_id) if lr.teacher_id else rivals.filter(bus_id=lr.bus_id)
    rivals.exclude(pk=lr.pk).update(
        status=LinkRequest.REJECTED, decided_by=lr.decided_by,
        decided_at=lr.decided_at, decision_note=note,
    )


@transaction.atomic
def request_teacher_link(user, staff_id):
    staff_id = (staff_id or "").strip()
    if not staff_id:
        raise LinkError("Enter your staff ID.")
    if Teacher.objects.filter(linked_user=user).exists():
        raise LinkError("Your account is already linked to a teacher record.")
    try:
        teacher = Teacher.objects.get(staff_id__iexact=staff_id)
    except Teacher.DoesNotExist:
        raise LinkError("No teacher found with that staff ID. Check it, or ask transport staff to add you.")
    if teacher.linked_user_id and teacher.linked_user_id != user.id:
        raise LinkError("This staff ID is already linked to another account.")
    _cancel_own_pending(user, LinkRequest.TEACHER)
    try:
        return LinkRequest.objects.create(user=user, kind=LinkRequest.TEACHER, teacher=teacher)
    except IntegrityError:
        raise LinkError("Could not create the request. Please try again.")


@transaction.atomic
def request_bus_claim(user, bus_number):
    profile = getattr(user, "profile", None)
    if not (profile and profile.role == "DRIVER"):
        raise LinkError("Only drivers can claim a bus.")
    bus_number = (bus_number or "").strip()
    if not bus_number:
        raise LinkError("Enter the bus number.")
    try:
        bus = Bus.objects.get(bus_number__iexact=bus_number)
    except Bus.DoesNotExist:
        raise LinkError("No bus with that number. Ask an admin to add it first.")
    if bus.driver_id == user.id:
        raise LinkError("You are already the driver of this bus.")
    if bus.driver_id:
        raise LinkError("Bus %s is already linked to another driver." % bus.bus_number)
    _cancel_own_pending(user, LinkRequest.DRIVER_BUS)
    try:
        return LinkRequest.objects.create(user=user, kind=LinkRequest.DRIVER_BUS, bus=bus)
    except IntegrityError:
        raise LinkError("Could not create the request. Please try again.")


def _lock_pending(lr, decided_by):
    if not can_manage_buses(decided_by):
        raise PermissionDenied("Only admins and transport staff can decide link requests.")
    locked = LinkRequest.objects.select_for_update().select_related("user").get(pk=lr.pk)
    if locked.status != LinkRequest.PENDING:
        raise LinkError("This request was already %s." % locked.get_status_display().lower())
    return locked


@transaction.atomic
def approve(lr, decided_by, note=""):
    lr = _lock_pending(lr, decided_by)
    user = lr.user

    if lr.kind == LinkRequest.TEACHER:
        teacher = Teacher.objects.select_for_update().get(pk=lr.teacher_id)
        if teacher.linked_user_id and teacher.linked_user_id != user.id:
            raise LinkError("This teacher record is already linked to another account.")
        if Teacher.objects.filter(linked_user=user).exclude(pk=teacher.pk).exists():
            raise LinkError("This account is already linked to a different teacher record.")
        teacher.linked_user = user
        teacher.save(update_fields=["linked_user"])
        user.profile.identity = "TEACHER"
        user.profile.save(update_fields=["identity"])
    else:
        bus = Bus.objects.select_for_update().get(pk=lr.bus_id)
        if bus.driver_id and bus.driver_id != user.id:
            raise LinkError("This bus already has another driver.")
        for old in Bus.objects.select_for_update().filter(driver=user).exclude(pk=bus.pk):
            old.driver = None
            old.save(update_fields=["driver"])
        bus.driver = user
        bus.save(update_fields=["driver"])

    lr.status = LinkRequest.APPROVED
    lr.decided_by = decided_by
    lr.decided_at = timezone.now()
    lr.decision_note = (note or "")[:200]
    lr.save(update_fields=["status", "decided_by", "decided_at", "decision_note"])
    _reject_rivals(lr, "Another request for the same record was approved.")
    return lr


@transaction.atomic
def reject(lr, decided_by, note=""):
    lr = _lock_pending(lr, decided_by)
    lr.status = LinkRequest.REJECTED
    lr.decided_by = decided_by
    lr.decided_at = timezone.now()
    lr.decision_note = (note or "")[:200]
    lr.save(update_fields=["status", "decided_by", "decided_at", "decision_note"])
    return lr

@transaction.atomic
def create_teacher_login(teacher, username, password):
    """
    Admin/staff create a teacher's login directly (Section 4 of the plan) --
    same end state as the self-service TeacherLinkView + approve() flow,
    done in one step instead of two.
    """
    username = (username or "").strip()
    if not username:
        raise LinkError("Enter a username.")
    if teacher.linked_user_id:
        raise LinkError("This teacher already has a login.")
    if User.objects.filter(username__iexact=username).exists():
        raise LinkError("That username is already taken.")
    validate_password(password)

    user = User.objects.create_user(username=username, password=password)
    user.profile.identity = "TEACHER"
    user.profile.save(update_fields=["identity"])
    teacher.linked_user = user
    teacher.save(update_fields=["linked_user"])
    return user
