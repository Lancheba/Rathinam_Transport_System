from rest_framework import generics, permissions, status
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from config import login_lockout
from config.throttles import LoginThrottle, RegisterThrottle
from .serializers import RegisterSerializer, UserSerializer, DriverLoginSerializer, SetIdentitySerializer
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


class MeView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class SetIdentityView(generics.GenericAPIView):
    serializer_class = SetIdentitySerializer
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)