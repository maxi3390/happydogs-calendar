from rest_framework import serializers
from .models import NurserySetting


class NurserySettingSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = NurserySetting
        fields = ['daily_booking_limit', 'logo_url', 'updated_at']
        read_only_fields = ['updated_at']

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None
