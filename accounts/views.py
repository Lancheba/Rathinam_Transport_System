from rest_framework import generics, permissions
from rest_framework_simplejwt.views import TokenObtainPairView
from config.throttles import LoginThrottle, RegisterThrottle
from .serializers import RegisterSerializer, UserSerializer
from django.contrib.auth.models import User


class LoginView(TokenObtainPairView):
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
