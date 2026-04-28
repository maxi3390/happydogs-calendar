from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from drf_spectacular.utils import extend_schema, extend_schema_view

from .serializers import (
    UserSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    UserLanguageSerializer,
    AdminUserUpdateSerializer,
    AdminSetPasswordSerializer,
    ChangePasswordSerializer,
    LoginSerializer,
)
from .permissions import IsAdmin

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """Register a new user."""
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = UserCreateSerializer

    @extend_schema(
        summary="Register new user",
        description="Create a new user account with email and password.",
        tags=['auth']
    )
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)

        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """Login with email and password."""
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer

    @extend_schema(
        summary="User login",
        description="Authenticate with email and password to receive JWT tokens.",
        request=LoginSerializer,
        responses={200: UserSerializer},
        tags=['auth']
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        password = serializer.validated_data['password']

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.check_password(password):
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active:
            return Response(
                {'error': 'Account is disabled'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        refresh = RefreshToken.for_user(user)

        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        })


class LogoutView(APIView):
    """Logout and blacklist the refresh token."""
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="User logout",
        description="Blacklist the refresh token to logout.",
        tags=['auth']
    )
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({'message': 'Successfully logged out'})
        except Exception:
            return Response({'message': 'Successfully logged out'})


class ProfileView(generics.RetrieveUpdateAPIView):
    """Get or update current user's profile."""
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserUpdateSerializer
        return UserSerializer

    @extend_schema(
        summary="Get current user profile",
        description="Retrieve the authenticated user's profile information.",
        tags=['auth']
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(
        summary="Update current user profile",
        description="Update the authenticated user's profile information.",
        tags=['auth']
    )
    def put(self, request, *args, **kwargs):
        return super().put(request, *args, **kwargs)

    @extend_schema(
        summary="Partially update current user profile",
        description="Partially update the authenticated user's profile information.",
        tags=['auth']
    )
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)


class UserLanguageView(generics.UpdateAPIView):
    """Self-service endpoint for the authenticated user to change their
    UI language preference. Narrowly-scoped on purpose: the existing
    admin user-update endpoints stay where they were.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = UserLanguageSerializer

    def get_object(self):
        return self.request.user

    @extend_schema(
        summary="Update current user's language",
        description=(
            "Update the authenticated user's UI language preference. "
            "Body: {\"language\": \"<en|es>\"}. Returns the updated "
            "user shape."
        ),
        tags=['auth'],
        responses={200: UserSerializer},
    )
    def patch(self, request, *args, **kwargs):
        # Run the validate-and-save flow, then return the full user
        # shape so the frontend doesn't need a second round-trip to
        # refresh its auth context.
        super().patch(request, *args, **kwargs)
        return Response(UserSerializer(self.get_object()).data)


class ChangePasswordView(generics.UpdateAPIView):
    """Change current user's password."""
    permission_classes = [IsAuthenticated]
    serializer_class = ChangePasswordSerializer

    def get_object(self):
        return self.request.user

    @extend_schema(
        summary="Change password",
        description="Change the authenticated user's password.",
        tags=['auth']
    )
    def put(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = self.get_object()
        user.set_password(serializer.validated_data['new_password'])
        user.save()

        return Response({'message': 'Password changed successfully'})


@extend_schema_view(
    list=extend_schema(
        summary="List all users",
        description="Admin only: Retrieve a list of all users.",
        tags=['users']
    ),
    retrieve=extend_schema(
        summary="Get user details",
        description="Admin only: Retrieve details of a specific user.",
        tags=['users']
    ),
    update=extend_schema(
        summary="Update user",
        description="Admin only: Update a user's information including role.",
        tags=['users']
    ),
    partial_update=extend_schema(
        summary="Partially update user",
        description="Admin only: Partially update a user's information.",
        tags=['users']
    ),
    destroy=extend_schema(
        summary="Delete user",
        description="Admin only: Delete a user account.",
        tags=['users']
    ),
)
class UserViewSet(viewsets.ModelViewSet):
    """Admin-only viewset for managing users."""
    queryset = User.objects.all()
    permission_classes = [IsAdmin]

    def get_serializer_class(self):
        if self.action in ['update', 'partial_update']:
            return AdminUserUpdateSerializer
        return UserSerializer

    @extend_schema(
        summary="Get current user info",
        description="Get the currently authenticated user's information.",
        tags=['users']
    )
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """Get current user info."""
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    @extend_schema(
        summary="Admin: reset a user's password",
        description=(
            "Admin-only. Resets the target user's password to the supplied "
            "value without requiring the old password — the recovery path "
            "for forgotten passwords in the absence of an email-based flow."
        ),
        request=AdminSetPasswordSerializer,
        tags=['users']
    )
    @action(detail=True, methods=['post'])
    def set_password(self, request, pk=None):
        """Admin override: set the target user's password.

        Permission gate is the viewset's class-level ``IsAdmin``;
        non-admins SHALL get 403 before reaching this method.
        """
        user = self.get_object()
        serializer = AdminSetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({'message': 'Password reset'})
