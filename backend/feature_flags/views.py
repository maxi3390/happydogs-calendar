from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import mixins, viewsets
from rest_framework.permissions import BasePermission, IsAuthenticated

from .models import FeatureFlag
from .serializers import FeatureFlagSerializer


class _IsAdminUser(BasePermission):
    """Admin iff `user.role == 'admin'`. Works with the project's custom User model.

    We intentionally don't use `rest_framework.permissions.IsAdminUser` — that
    class checks `is_staff`, which is a Django-auth concept distinct from the
    product's `role` field.
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'role', None) == 'admin'
        )


@extend_schema_view(
    list=extend_schema(tags=['feature-flags']),
    retrieve=extend_schema(tags=['feature-flags']),
    partial_update=extend_schema(tags=['feature-flags']),
)
class FeatureFlagViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """Flags are globally readable by any authenticated user; only admins can
    flip them. Create and destroy are not exposed — the canonical source of
    flags is the seed migration, not the API.
    """

    queryset = FeatureFlag.objects.all()
    serializer_class = FeatureFlagSerializer
    lookup_field = 'key'
    # Only PATCH is supported for mutations. Full-replace PUT would let a
    # caller submit `{}` and blank every field that falls back to defaults;
    # forbidding it keeps the surface honest.
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        return [_IsAdminUser()]
