from rest_framework import serializers
from .models import NurserySetting


class NurserySettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = NurserySetting
        fields = ['daily_booking_limit', 'updated_at']
        read_only_fields = ['updated_at']
