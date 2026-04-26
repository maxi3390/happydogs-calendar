from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    """Permission class that only allows admin users."""

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'admin'
        )


class IsAdminOrReadOnly(permissions.BasePermission):
    """Permission class that allows read for all authenticated users, write for admins only."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.method in permissions.SAFE_METHODS:
            return True

        return request.user.role == 'admin'


class IsOwnerOrAdmin(permissions.BasePermission):
    """Permission class that allows access to owner of object or admin."""

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.user.role == 'admin':
            return True

        # Check if object has a user field
        if hasattr(obj, 'user'):
            return obj.user == request.user

        # Check if object is the user itself
        return obj == request.user


class IsAuthenticated(permissions.BasePermission):
    """Permission class that allows any authenticated user."""

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
