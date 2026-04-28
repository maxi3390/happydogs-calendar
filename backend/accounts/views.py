from datetime import timedelta

from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
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


def _last_admin_check(affected_ids):
    """Refuse the action if it would drop the active-admin count to zero.

    ``affected_ids`` is the set of user ids that the caller is about to
    deactivate / demote / delete. The check excludes them from the
    candidate pool of remaining active admins. Used by every endpoint
    that can demote an admin, both single and bulk.
    """
    remaining_admins = (
        User.objects.filter(role=User.Role.ADMIN, is_active=True)
        .exclude(id__in=affected_ids)
        .count()
    )
    if remaining_admins == 0:
        return Response(
            {'detail': 'Cannot remove the last active admin.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return None


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
    """Admin-only viewset for managing users.

    Exposes the canonical CRUD endpoints plus a small set of action
    verbs (deactivate / activate / promote / demote / delete) and
    their bulk counterparts, used by ``/admin/users``. See
    ``openspec/specs/backend/auth/spec.md`` and
    ``openspec/specs/frontend/user-management/spec.md``.
    """
    queryset = User.objects.all()
    permission_classes = [IsAdmin]

    def get_serializer_class(self):
        if self.action in ['update', 'partial_update']:
            return AdminUserUpdateSerializer
        return UserSerializer

    def get_queryset(self):
        """Apply admin-list filters from query params.

        Supported:
          - ``role=admin|user``
          - ``is_active=true|false``
          - ``last_login_within_days=<int>`` (mutually exclusive with the next)
          - ``last_login_never=true``
        """
        qs = super().get_queryset()
        params = self.request.query_params

        role = params.get('role')
        if role in (User.Role.ADMIN, User.Role.USER):
            qs = qs.filter(role=role)

        is_active = params.get('is_active')
        if is_active in ('true', 'false'):
            qs = qs.filter(is_active=(is_active == 'true'))

        within_days = params.get('last_login_within_days')
        never = params.get('last_login_never') == 'true'
        if within_days is not None:
            try:
                days = int(within_days)
            except (TypeError, ValueError):
                days = None
            if days is not None and days > 0:
                cutoff = timezone.now() - timedelta(days=days)
                qs = qs.filter(last_login__gte=cutoff)
        elif never:
            qs = qs.filter(last_login__isnull=True)

        return qs

    def destroy(self, request, *args, **kwargs):
        """Refuse to delete an active user — operators must deactivate first.

        Hard delete is intentional for inactive users (their FK chain is
        small: notifications cascade, audit-log rows SET_NULL).
        """
        target = self.get_object()
        if target.is_active:
            return Response(
                {'detail': 'User must be deactivated before deletion.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if target.id == request.user.id:
            return Response(
                {'detail': 'Cannot delete yourself.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if target.role == User.Role.ADMIN:
            err = _last_admin_check([target.id])
            if err is not None:
                return err
        return super().destroy(request, *args, **kwargs)

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

    # ── Per-user state actions ────────────────────────────────────────
    #
    # ``deactivate`` / ``demote`` / (single ``destroy`` above) are all
    # gated by the same self + last-admin checks. ``activate`` /
    # ``promote`` are unconditionally allowed (you can't use them to
    # lock yourself out).

    @extend_schema(summary="Deactivate user", tags=['users'])
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        target = self.get_object()
        if target.id == request.user.id:
            return Response(
                {'detail': 'Cannot deactivate yourself.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if target.role == User.Role.ADMIN and target.is_active:
            err = _last_admin_check([target.id])
            if err is not None:
                return err
        target.is_active = False
        target.save(update_fields=['is_active', 'updated_at'])
        return Response(UserSerializer(target).data)

    @extend_schema(summary="Activate user", tags=['users'])
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        target = self.get_object()
        target.is_active = True
        target.save(update_fields=['is_active', 'updated_at'])
        return Response(UserSerializer(target).data)

    @extend_schema(summary="Promote user to admin", tags=['users'])
    @action(detail=True, methods=['post'])
    def promote(self, request, pk=None):
        target = self.get_object()
        target.role = User.Role.ADMIN
        target.save(update_fields=['role', 'updated_at'])
        return Response(UserSerializer(target).data)

    @extend_schema(summary="Demote admin to user", tags=['users'])
    @action(detail=True, methods=['post'])
    def demote(self, request, pk=None):
        target = self.get_object()
        if target.id == request.user.id:
            return Response(
                {'detail': 'Cannot demote yourself.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if target.role == User.Role.ADMIN and target.is_active:
            err = _last_admin_check([target.id])
            if err is not None:
                return err
        target.role = User.Role.USER
        target.save(update_fields=['role', 'updated_at'])
        return Response(UserSerializer(target).data)

    @extend_schema(
        summary="Get deletion impact",
        description=(
            "Return the side-effect counts for deleting this user. "
            "``notifications`` will be CASCADE-removed; "
            "``audit_log_entries`` will SET_NULL their history_user "
            "(rows survive but become anonymous). The frontend renders "
            "these counts in the delete-confirm modal."
        ),
        tags=['users'],
    )
    @action(detail=True, methods=['get'], url_path='deletion_impact')
    def deletion_impact(self, request, pk=None):
        target = self.get_object()
        # Deferred imports keep the views.py free of cross-app cycles.
        from notifications.models import Notification
        from domain.pets.models import Pet
        from domain.owners.models import Owner
        from domain.notes.models import MedicalNote

        notifications = Notification.objects.filter(recipient_user=target).count()
        # Each tracked model carries its own history; sum across the
        # ones the audit-log feature instruments.
        audit_log_entries = (
            Pet.history.filter(history_user=target).count()
            + Owner.history.filter(history_user=target).count()
            + MedicalNote.history.filter(history_user=target).count()
        )
        return Response({
            'notifications': notifications,
            'audit_log_entries': audit_log_entries,
        })

    # ── Bulk actions ──────────────────────────────────────────────────
    #
    # All bulk endpoints accept ``{ids: [int, ...]}`` in the JSON body,
    # apply the same self / last-admin guards as the per-user actions,
    # and run in a single transaction so a failed precondition leaves
    # the row state untouched.

    def _bulk_ids(self, request):
        ids = request.data.get('ids', [])
        if not isinstance(ids, list) or not all(isinstance(i, int) for i in ids):
            return None, Response(
                {'detail': '``ids`` must be a list of integers.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return ids, None

    def _reject_self_in_bulk(self, request, ids):
        if request.user.id in ids:
            return Response(
                {'detail': 'Cannot include yourself in this bulk action.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return None

    @extend_schema(summary="Bulk deactivate users", tags=['users'])
    @action(detail=False, methods=['post'], url_path='bulk_deactivate')
    def bulk_deactivate(self, request):
        ids, err = self._bulk_ids(request)
        if err is not None:
            return err
        if (e := self._reject_self_in_bulk(request, ids)) is not None:
            return e
        with transaction.atomic():
            qs = User.objects.select_for_update().filter(id__in=ids)
            admin_ids = list(qs.filter(role=User.Role.ADMIN, is_active=True).values_list('id', flat=True))
            if admin_ids:
                if (e := _last_admin_check(admin_ids)) is not None:
                    return e
            updated = qs.update(is_active=False, updated_at=timezone.now())
        return Response({'updated': updated})

    @extend_schema(summary="Bulk activate users", tags=['users'])
    @action(detail=False, methods=['post'], url_path='bulk_activate')
    def bulk_activate(self, request):
        ids, err = self._bulk_ids(request)
        if err is not None:
            return err
        with transaction.atomic():
            updated = (
                User.objects.select_for_update().filter(id__in=ids)
                .update(is_active=True, updated_at=timezone.now())
            )
        return Response({'updated': updated})

    @extend_schema(
        summary="Bulk delete users",
        description=(
            "Delete every user in ``ids``. Refuses if any target is "
            "still active or is the requesting admin, or if the action "
            "would leave zero active admins."
        ),
        tags=['users'],
    )
    @action(detail=False, methods=['post'], url_path='bulk_delete')
    def bulk_delete(self, request):
        ids, err = self._bulk_ids(request)
        if err is not None:
            return err
        if (e := self._reject_self_in_bulk(request, ids)) is not None:
            return e
        with transaction.atomic():
            qs = User.objects.select_for_update().filter(id__in=ids)
            active = list(qs.filter(is_active=True).values_list('id', flat=True))
            if active:
                return Response(
                    {
                        'detail': 'All users must be deactivated before deletion.',
                        'active_ids': active,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            admin_ids = list(qs.filter(role=User.Role.ADMIN).values_list('id', flat=True))
            if admin_ids:
                if (e := _last_admin_check(admin_ids)) is not None:
                    return e
            deleted, _ = qs.delete()
        return Response({'deleted': deleted})

    @extend_schema(
        summary="Bulk set role",
        description=(
            "Set ``role`` for every user in ``ids``. Body: "
            "``{ids: [...], role: 'admin'|'user'}``. Demoting refuses "
            "to leave zero active admins."
        ),
        tags=['users'],
    )
    @action(detail=False, methods=['post'], url_path='bulk_set_role')
    def bulk_set_role(self, request):
        ids, err = self._bulk_ids(request)
        if err is not None:
            return err
        role = request.data.get('role')
        if role not in (User.Role.ADMIN, User.Role.USER):
            return Response(
                {'detail': "``role`` must be 'admin' or 'user'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Self-demote is the only case we reject; self-promote is a no-op
        # (the requester is already admin) and harmless.
        if role == User.Role.USER:
            if (e := self._reject_self_in_bulk(request, ids)) is not None:
                return e
        with transaction.atomic():
            qs = User.objects.select_for_update().filter(id__in=ids)
            if role == User.Role.USER:
                # Only the rows currently admin and active count as
                # "leaving" the admin pool.
                losing_admin_ids = list(
                    qs.filter(role=User.Role.ADMIN, is_active=True).values_list('id', flat=True)
                )
                if losing_admin_ids:
                    if (e := _last_admin_check(losing_admin_ids)) is not None:
                        return e
            updated = qs.update(role=role, updated_at=timezone.now())
        return Response({'updated': updated})
