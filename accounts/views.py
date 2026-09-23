from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from config.throttles import LoginThrottle, RegisterThrottle
from .serializers import RegisterSerializer, UserSerializer, DriverLoginSerializer, SetIdentitySerializer
from django.contrib.auth.models import User


class LoginView(TokenObtainPairView):
    serializer_class = DriverLoginSerializer
    throttle_classes = [LoginThrottle]


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
