from rest_framework import serializers
from .models import Pet, Schedule


class PetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pet
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']


class PetListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing pets"""
    class Meta:
        model = Pet
        fields = ['id', 'name', 'species', 'temperament', 'dominance_level', 'size']


class ScheduleSerializer(serializers.ModelSerializer):
    pet_details = PetListSerializer(source='pet', read_only=True)
    conflicts = serializers.SerializerMethodField()

    class Meta:
        model = Schedule
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

    def get_conflicts(self, obj):
        return obj.check_conflicts()


class ScheduleCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Schedule
        fields = ['pet', 'start_date', 'end_date', 'start_time', 'end_time', 'status', 'notes']

    def validate(self, data):
        start_time = data.get('start_time', getattr(self.instance, 'start_time', None))
        end_time = data.get('end_time', getattr(self.instance, 'end_time', None))
        start_date = data.get('start_date', getattr(self.instance, 'start_date', None))
        end_date = data.get('end_date', getattr(self.instance, 'end_date', None))

        if start_time and end_time and start_time >= end_time:
            raise serializers.ValidationError("End time must be after start time")
        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError("End date must be on or after start date")
        return data


class ConflictCheckSerializer(serializers.Serializer):
    pet_id = serializers.IntegerField()
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    start_time = serializers.TimeField()
    end_time = serializers.TimeField()
    exclude_schedule_id = serializers.IntegerField(required=False)
