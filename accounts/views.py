from rest_framework import generics, permissions, status
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from config import login_lockout
from config.throttles import LoginThrottle, RegisterThrottle
from .serializers import RegisterSerializer, UserSerializer, DriverLoginSerializer, SetIdentitySerializer, UpdatePhoneSerializer
from django.contrib.auth.models import User


class LoginView(TokenObtainPairView):
    """Sign in. Limited per IP (LoginThrottle) and per username (temporary lockout)."""

    serializer_class = DriverLoginSerializer
    throttle_classes = [LoginThrottle]

    def post(self, request, *args, **kwargs):
        data = request.data
        username = data.get("username") if hasattr(data, "get") else None

        wait = login_lockout.seconds_locked(username)
        if wait:
            return Response(
                {"detail": "Too many failed sign-in attempts for this account. Try again later."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
                headers={"Retry-After": str(wait)},
            )

        try:
            response = super().post(request, *args, **kwargs)
        except APIException as exc:
            if exc.status_code == status.HTTP_401_UNAUTHORIZED:  # wrong username or password
                login_lockout.register_failure(username)
            raise

        login_lockout.clear_failures(username)
        return response


class RegisterView(generics.CreateAPIView):
    throttle_classes = [RegisterThrottle]
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken


class LogoutView(generics.GenericAPIView):
    """POST {"refresh": "..."} blacklists that refresh token. Access tokens still
    expire on their own (short-lived); this stops the refresh token being reused."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        token = request.data.get("refresh")
        if not token:
            return Response({"detail": "refresh is required."}, status=400)
        try:
            RefreshToken(token).blacklist()
        except TokenError:
            return Response({"detail": "Invalid or already-invalidated refresh token."}, status=400)
        return Response(status=205)


class MeView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def patch(self, request, *args, **kwargs):
        serializer = UpdatePhoneSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)


class SetIdentityView(generics.GenericAPIView):
    serializer_class = SetIdentitySerializer
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)


# --- Approval-based linking (audit items 2.9 / 3.1) ----------------------------------------
from django.shortcuts import get_object_or_404  # noqa: E402
from django.utils import timezone  # noqa: E402

from attendance.models import Teacher  # noqa: E402
from config.throttles import LinkRequestThrottle  # noqa: E402
from . import linking  # noqa: E402
from .models import LinkRequest  # noqa: E402
from .permissions import CanManageBuses  # noqa: E402
from .serializers import (  # noqa: E402
    DecisionInputSerializer,
    LinkRequestSerializer,
    TeacherLinkRequestInputSerializer,
)

LIST_LIMIT = 200
_MAX_PK = 2 ** 31  # keep absurd ids from reaching the database driver


def _teacher_link_state(user):
    """What the teacher screen needs: linked or not, and the open request if any."""
    teacher = Teacher.objects.filter(linked_user=user).first()
    pending = (
        LinkRequest.objects.filter(user=user, kind=LinkRequest.TEACHER, status=LinkRequest.PENDING)
        .select_related("teacher", "user", "decided_by").first()
    )
    return {
        "linked": teacher is not None,
        "teacher": (
            {"id": teacher.id, "staff_id": teacher.staff_id, "name": teacher.name,
             "department": teacher.department} if teacher else None
        ),
        "request": LinkRequestSerializer(pending, context={"own": True}).data if pending else None,
    }


class TeacherLinkView(generics.GenericAPIView):
    """
    A teacher asks to be linked to their staff record. Nothing is linked until staff approve.

    GET    -> {linked, teacher, request}
    POST   -> {"staff_id": "T100"} files a pending request (replaces any earlier pending one)
    DELETE -> withdraw my pending request. Never unlinks an approved teacher (staff do that).
    """

    serializer_class = TeacherLinkRequestInputSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_throttles(self):
        return [LinkRequestThrottle()] if self.request.method == "POST" else []

    def get(self, request):
        return Response(_teacher_link_state(request.user))

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            linking.request_teacher_link(request.user, serializer.validated_data["staff_id"])
        except linking.LinkError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(_teacher_link_state(request.user), status=status.HTTP_201_CREATED)

    def delete(self, request):
        cancelled = LinkRequest.objects.filter(
            user=request.user, kind=LinkRequest.TEACHER, status=LinkRequest.PENDING,
        ).update(
            status=LinkRequest.CANCELLED, decided_at=timezone.now(),
            decision_note="Withdrawn by the requester.",
        )
        return Response({"cancelled": bool(cancelled)})


class LinkRequestListView(generics.GenericAPIView):
    """
    Staff queue.  GET /api/auth/link-requests/?status=PENDING|APPROVED|REJECTED|CANCELLED|ALL
    &kind=TEACHER|DRIVER_BUS.  Default status is PENDING.  Returns {count, results}; `count` is
    the true total even when `results` is capped at LIST_LIMIT rows (newest first).
    """

    serializer_class = LinkRequestSerializer
    permission_classes = [CanManageBuses]

    def get(self, request):
        wanted_status = (request.query_params.get("status") or LinkRequest.PENDING).upper()
        valid_status = {value for value, _ in LinkRequest.STATUSES} | {"ALL"}
        if wanted_status not in valid_status:
            return Response({"status": "Must be one of: %s." % ", ".join(sorted(valid_status))}, status=400)

        wanted_kind = (request.query_params.get("kind") or "").upper()
        valid_kind = {value for value, _ in LinkRequest.KINDS}
        if wanted_kind and wanted_kind not in valid_kind:
            return Response({"kind": "Must be one of: %s." % ", ".join(sorted(valid_kind))}, status=400)

        qs = LinkRequest.objects.select_related("user", "teacher", "bus", "decided_by").order_by("-id")
        if wanted_status != "ALL":
            qs = qs.filter(status=wanted_status)
        if wanted_kind:
            qs = qs.filter(kind=wanted_kind)

        return Response({
            "count": qs.count(),
            "results": LinkRequestSerializer(qs[:LIST_LIMIT], many=True).data,
        })


class _LinkRequestDecisionView(generics.GenericAPIView):
    serializer_class = DecisionInputSerializer
    permission_classes = [CanManageBuses]
    decide = None  # set by the two subclasses below

    def post(self, request, pk):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if pk > _MAX_PK:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        lr = get_object_or_404(LinkRequest, pk=pk)
        try:
            lr = type(self).decide(lr, request.user, note=serializer.validated_data.get("note", ""))
        except linking.LinkError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(LinkRequestSerializer(lr).data)


class LinkRequestApproveView(_LinkRequestDecisionView):
    decide = staticmethod(linking.approve)


class LinkRequestRejectView(_LinkRequestDecisionView):
    decide = staticmethod(linking.reject)
