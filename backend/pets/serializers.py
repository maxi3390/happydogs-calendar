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
        if data['start_time'] >= data['end_time']:
            raise serializers.ValidationError("End time must be after start time")
        if data['start_date'] > data['end_date']:
            raise serializers.ValidationError("End date must be on or after start date")
        return data


class ConflictCheckSerializer(serializers.Serializer):
    pet_id = serializers.IntegerField()
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    start_time = serializers.TimeField()
    end_time = serializers.TimeField()
    exclude_schedule_id = serializers.IntegerField(required=False)
