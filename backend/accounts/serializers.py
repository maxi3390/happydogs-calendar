from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user details."""
    full_name = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'full_name', 'role',
                  'language', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserLanguageSerializer(serializers.ModelSerializer):
    """Serializer for the self-service ``PATCH /api/users/me/language/`` endpoint.

    Only the ``language`` field is editable; everything else is rejected with
    a serializer-level validation error rather than silently ignored, so a
    malformed client request fails loudly.
    """
    class Meta:
        model = User
        fields = ['language']


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['email', 'password', 'password_confirm', 'first_name', 'last_name']

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile."""

    class Meta:
        model = User
        fields = ['first_name', 'last_name']


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for admin to update any user."""

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'role', 'is_active']


class ChangePasswordSerializer(serializers.Serializer):
    """Self-service password change.

    Requires the caller to know their current password — the canonical
    rotation path. ``AdminSetPasswordSerializer`` is the admin-override
    counterpart that drops the old-password requirement.
    """
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(write_only=True)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({'new_password_confirm': 'New passwords do not match.'})
        return attrs


class AdminSetPasswordSerializer(serializers.Serializer):
    """Admin-override password reset. No ``old_password``.

    Used by ``UserViewSet.set_password`` (admin-only). The admin
    endpoint exists specifically to recover from forgotten passwords
    without an email-based flow, so requiring the old value would
    defeat the purpose. ``AUTH_PASSWORD_VALIDATORS`` still applies.
    """
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({'new_password_confirm': 'New passwords do not match.'})
        return attrs


class LoginSerializer(serializers.Serializer):
    """Serializer for user login."""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
