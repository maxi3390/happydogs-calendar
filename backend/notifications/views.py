from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Notification, NotificationPreference, NotificationTemplate
from .serializers import (
    NotificationSerializer,
    NotificationPreferenceSerializer,
    NotificationTemplateSerializer,
)


@extend_schema_view(
    list=extend_schema(
        summary="List the logged-in user's undismissed notifications",
        parameters=[
            OpenApiParameter(
                name='unread_only', type=OpenApiTypes.BOOL,
                description='When set, return only rows where read_at IS NULL.',
            ),
        ],
        tags=['notifications'],
    ),
)
class NotificationViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """Read-only listing + per-row actions for the current user's notifications.

    Notifications are created server-side by the daily cron command;
    clients can mark them read or dismiss them but cannot create or
    delete them directly.
    """

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Notification.objects.filter(
            recipient_user=self.request.user,
            dismissed_at__isnull=True,
        ).select_related('pet', 'pet__owner')
        if self.request.query_params.get('unread_only'):
            qs = qs.filter(read_at__isnull=True)
        return qs

    @extend_schema(
        summary="Mark a notification as read",
        request=None,
        responses={200: NotificationSerializer},
        tags=['notifications'],
    )
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notif = self._get_owned(pk)
        if notif.read_at is None:
            notif.read_at = timezone.now()
            notif.save(update_fields=['read_at'])
        return Response(self.get_serializer(notif).data)

    @extend_schema(
        summary="Dismiss a notification",
        request=None,
        responses={200: NotificationSerializer},
        tags=['notifications'],
    )
    @action(detail=True, methods=['post'])
    def dismiss(self, request, pk=None):
        notif = self._get_owned(pk)
        if notif.dismissed_at is None:
            notif.dismissed_at = timezone.now()
            notif.save(update_fields=['dismissed_at'])
        return Response(self.get_serializer(notif).data)

    @extend_schema(
        summary="Dismiss all of the user's undismissed notifications",
        request=None,
        responses={200: dict},
        tags=['notifications'],
    )
    @action(detail=False, methods=['post'])
    def dismiss_all(self, request):
        count = Notification.objects.filter(
            recipient_user=request.user, dismissed_at__isnull=True,
        ).update(dismissed_at=timezone.now())
        return Response({'dismissed': count})

    def _get_owned(self, pk):
        """Look up a notification, returning 404 if it doesn't belong
        to the requesting user. Treating cross-user IDs as 'not found'
        avoids leaking the existence of other users' notifications.
        """
        return get_object_or_404(
            Notification, pk=pk, recipient_user=self.request.user,
        )


@extend_schema_view(
    list=extend_schema(tags=['notifications']),
)
class NotificationPreferenceView(viewsets.GenericViewSet):
    """Single-row endpoint for the logged-in user's notification preferences.

    GET materialises a default row (``email_enabled=True``) on first
    call. PATCH updates the row.
    """
    serializer_class = NotificationPreferenceSerializer
    permission_classes = [IsAuthenticated]

    def list(self, request):
        prefs, _ = NotificationPreference.objects.get_or_create(user=request.user)
        return Response(self.get_serializer(prefs).data)

    def partial_update(self, request, *args, **kwargs):
        prefs, _ = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = self.get_serializer(prefs, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


@extend_schema_view(
    list=extend_schema(tags=['notifications']),
    partial_update=extend_schema(tags=['notifications']),
)
class NotificationTemplateViewSet(
    mixins.ListModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """Per-nursery message templates for the forward-to-owner buttons.

    Two scopes only in v1: ``treatment_due`` and ``pet_birthday``.
    Both are materialised on first list call. POST and DELETE are
    intentionally unsupported.
    """
    serializer_class = NotificationTemplateSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'scope'

    def get_queryset(self):
        # Materialise both scopes on first call so the catalog is
        # always fully populated.
        for choice, _ in NotificationTemplate.SCOPE_CHOICES:
            NotificationTemplate.objects.get_or_create(scope=choice)
        return NotificationTemplate.objects.all()
