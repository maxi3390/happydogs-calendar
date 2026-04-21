from rest_framework import serializers

from .models import FeatureFlag


class FeatureFlagSerializer(serializers.ModelSerializer):
    """Flag serializer.

    `key`, `label`, and `description` are write-once at seed time — the API
    only exposes `enabled` as a writable field so admins cannot rename /
    rekey flags accidentally from the UI.
    """

    class Meta:
        model = FeatureFlag
        fields = ['id', 'key', 'label', 'description', 'enabled', 'updated_at']
        read_only_fields = ['id', 'key', 'label', 'description', 'updated_at']
