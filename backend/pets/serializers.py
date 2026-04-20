from rest_framework import serializers
from django.db import transaction
from .models import Owner, Pet, Schedule, Vaccination, VaccinationType, Document, MedicalNote


class VaccinationTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = VaccinationType
        fields = ['id', 'name', 'label', 'enabled', 'order']


class OwnerSerializer(serializers.ModelSerializer):
    pet_count = serializers.SerializerMethodField()
    profile_picture_url = serializers.SerializerMethodField()

    class Meta:
        model = Owner
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

    def get_pet_count(self, obj):
        return obj.pets.count()

    def get_profile_picture_url(self, obj):
        if obj.profile_picture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_picture.url)
            return obj.profile_picture.url
        return None


class OwnerListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing owners in dropdowns"""
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Owner
        fields = ['id', 'first_name', 'last_name', 'full_name', 'phone', 'email', 'id_number']


class VaccinationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vaccination
        fields = ['id', 'vax_type', 'date', 'created_at']
        read_only_fields = ['created_at']


class PetSerializer(serializers.ModelSerializer):
    owner_details = OwnerListSerializer(source='owner', read_only=True)
    vaccinations = VaccinationSerializer(many=True, required=False)
    profile_picture_url = serializers.SerializerMethodField()
    medical_notes_count = serializers.SerializerMethodField()

    class Meta:
        model = Pet
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

    def get_profile_picture_url(self, obj):
        if obj.profile_picture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_picture.url)
            return obj.profile_picture.url
        return None

    def get_medical_notes_count(self, obj):
        return obj.medical_notes.count()

    @transaction.atomic
    def create(self, validated_data):
        vaccinations_data = validated_data.pop('vaccinations', [])
        pet = Pet.objects.create(**validated_data)
        for vax_data in vaccinations_data:
            Vaccination.objects.create(pet=pet, **vax_data)
        return pet

    @transaction.atomic
    def update(self, instance, validated_data):
        vaccinations_data = validated_data.pop('vaccinations', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if vaccinations_data is not None:
            instance.vaccinations.all().delete()
            for vax_data in vaccinations_data:
                Vaccination.objects.create(pet=instance, **vax_data)
        return instance


class PetListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing pets"""
    class Meta:
        model = Pet
        fields = ['id', 'name', 'species', 'temperament', 'dominance_level', 'size', 'owner']


class PetWithOwnerSerializer(serializers.ModelSerializer):
    """Serializer for pets with owner details"""
    owner_details = OwnerListSerializer(source='owner', read_only=True)
    vaccinations = VaccinationSerializer(many=True, read_only=True)

    class Meta:
        model = Pet
        fields = ['id', 'name', 'species', 'breed', 'age', 'temperament', 'dominance_level', 'size', 'neutered', 'sex', 'birth_date', 'special_notes', 'owner', 'owner_details', 'vaccinations']


class OwnerWithPetsSerializer(serializers.ModelSerializer):
    """Serializer for owner with their pets"""
    pets = PetListSerializer(many=True, read_only=True)
    profile_picture_url = serializers.SerializerMethodField()

    class Meta:
        model = Owner
        fields = ['id', 'first_name', 'last_name', 'email', 'phone', 'id_number',
                  'street', 'city', 'state', 'province', 'country',
                  'emergency_contact', 'emergency_phone', 'notes',
                  'profile_picture_url', 'pets', 'created_at']

    def get_profile_picture_url(self, obj):
        if obj.profile_picture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_picture.url)
            return obj.profile_picture.url
        return None


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


class BatchScheduleCreateSerializer(serializers.Serializer):
    """Serializer for creating schedules for multiple pets at once"""
    pet_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1
    )
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    start_time = serializers.TimeField()
    end_time = serializers.TimeField()
    status = serializers.ChoiceField(
        choices=['scheduled', 'checked_in', 'completed', 'cancelled'],
        default='scheduled'
    )
    notes = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, data):
        if data['start_time'] >= data['end_time']:
            raise serializers.ValidationError("End time must be after start time")
        if data['start_date'] > data['end_date']:
            raise serializers.ValidationError("End date must be on or after start date")
        return data


class DocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = ['id', 'pet', 'owner', 'file', 'file_url', 'original_filename',
                  'description', 'uploaded_at']
        read_only_fields = ['uploaded_at', 'original_filename']

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None

    def validate(self, data):
        pet = data.get('pet')
        owner = data.get('owner')
        if not pet and not owner:
            raise serializers.ValidationError(
                "A document must be linked to a pet or an owner.")
        if pet and owner:
            raise serializers.ValidationError(
                "A document cannot be linked to both a pet and an owner.")
        return data

    def create(self, validated_data):
        file_obj = validated_data.get('file')
        if file_obj:
            validated_data['original_filename'] = file_obj.name
        return super().create(validated_data)


class MedicalNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicalNote
        fields = ['id', 'pet', 'title', 'description', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']
