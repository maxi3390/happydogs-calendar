from rest_framework import serializers
from django.db import transaction
from .models import (
    Owner, Pet, PetIncompatibility, Schedule, Vaccination, VaccinationType,
    Document, MedicalNote, Vet,
)


class VaccinationTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = VaccinationType
        fields = ['id', 'name', 'label', 'enabled', 'order']


class VetSerializer(serializers.ModelSerializer):
    """Full serializer for the Vet model, including inherited Address fields."""

    class Meta:
        model = Vet
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']


class VetListSerializer(serializers.ModelSerializer):
    """Compact projection of a Vet used as a nested read-only block on
    pet and owner serializers. Renders just enough identifying / contact
    info (name + phone + email + city) for the pet- and owner-detail
    popups to show a real label instead of a raw FK id. The `id` lets the
    UI re-open the full VetDetailsPopup without a second round-trip."""

    class Meta:
        model = Vet
        fields = ['id', 'name', 'phone', 'email', 'city']


class OwnerSerializer(serializers.ModelSerializer):
    pet_count = serializers.SerializerMethodField()
    profile_picture_url = serializers.SerializerMethodField()
    primary_vet_details = VetListSerializer(source='primary_vet', read_only=True)
    emergency_vet_details = VetListSerializer(source='emergency_vet', read_only=True)

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
    profile_picture_url = serializers.SerializerMethodField()

    class Meta:
        model = Owner
        fields = ['id', 'first_name', 'last_name', 'full_name', 'phone', 'email', 'id_number', 'profile_picture_url']

    def get_profile_picture_url(self, obj):
        if obj.profile_picture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_picture.url)
            return obj.profile_picture.url
        return None


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
    vet_override_details = VetListSerializer(source='vet_override', read_only=True)
    # `effective_vet_details` surfaces the vet actually responsible for the
    # pet (override > owner's primary > none), which is what the pet list
    # accordion shows for quick emergency access. Kept separate from
    # `vet_override_details` because the two mean different things: the
    # override is "what's set on the pet", the effective vet is "who to
    # call right now".
    effective_vet_details = serializers.SerializerMethodField()
    # Emergency vet comes from the pet's owner (there is no pet-level
    # emergency vet field). Projecting it onto the pet keeps the `/pets`
    # list a single round-trip.
    emergency_vet_details = serializers.SerializerMethodField()

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

    def get_effective_vet_details(self, obj):
        vet = obj.effective_vet
        if vet is None:
            return None
        return VetListSerializer(vet).data

    def get_emergency_vet_details(self, obj):
        if obj.owner_id is None:
            return None
        vet = obj.owner.emergency_vet
        if vet is None:
            return None
        return VetListSerializer(vet).data

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
    profile_picture_url = serializers.SerializerMethodField()

    class Meta:
        model = Pet
        fields = ['id', 'name', 'species', 'temperament', 'dominance_level', 'size', 'owner', 'profile_picture_url']

    def get_profile_picture_url(self, obj):
        if obj.profile_picture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_picture.url)
            return obj.profile_picture.url
        return None


class PetWithOwnerSerializer(serializers.ModelSerializer):
    """Serializer for pets with owner details"""
    owner_details = OwnerListSerializer(source='owner', read_only=True)
    vaccinations = VaccinationSerializer(many=True, read_only=True)

    class Meta:
        model = Pet
        fields = [
            'id', 'name', 'species', 'breed', 'age', 'temperament',
            'dominance_level', 'size', 'neutered', 'sex', 'birth_date',
            'special_notes', 'owner', 'owner_details', 'vaccinations',
        ]


class OwnerWithPetsSerializer(serializers.ModelSerializer):
    """Serializer for owner with their pets"""
    pets = PetListSerializer(many=True, read_only=True)
    profile_picture_url = serializers.SerializerMethodField()
    primary_vet_details = VetListSerializer(source='primary_vet', read_only=True)
    emergency_vet_details = VetListSerializer(source='emergency_vet', read_only=True)

    class Meta:
        model = Owner
        fields = ['id', 'first_name', 'last_name', 'email', 'phone', 'id_number',
                  'street', 'city', 'state', 'province', 'country',
                  'emergency_contact', 'emergency_phone', 'notes',
                  'primary_vet', 'emergency_vet',
                  'primary_vet_details', 'emergency_vet_details',
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
    reason_groups = serializers.SerializerMethodField()

    class Meta:
        model = Schedule
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

    def get_conflicts(self, obj):
        if not hasattr(obj, '_cached_conflicts'):
            obj._cached_conflicts = obj.check_conflicts()
        return obj._cached_conflicts

    def get_reason_groups(self, obj):
        # Import here to avoid a circular import at module load.
        from domain.schedules.models import collate_reason_groups
        return collate_reason_groups(self.get_conflicts(obj))


class ScheduleCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Schedule
        fields = ['pet', 'start_date', 'end_date', 'start_time', 'end_time', 'status', 'notes']

    def validate(self, data):
        start_time = data.get('start_time', getattr(self.instance, 'start_time', None))
        end_time = data.get('end_time', getattr(self.instance, 'end_time', None))
        start_date = data.get('start_date', getattr(self.instance, 'start_date', None))
        end_date = data.get('end_date', getattr(self.instance, 'end_date', None))

        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError("End date must be on or after start date")
        # The time-order rule only applies to same-day bookings. On a multi-day
        # stay `start_time` is the drop-off on `start_date` and `end_time` is
        # the pickup on `end_date`, so they may legitimately cross midnight.
        if (
            start_time and end_time and start_date and end_date
            and start_date == end_date and start_time >= end_time
        ):
            raise serializers.ValidationError(
                "On a single-day schedule, end time must be after start time"
            )
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
        if data['start_date'] > data['end_date']:
            raise serializers.ValidationError("End date must be on or after start date")
        # Single-day bookings keep the start-time < end-time rule. Multi-day
        # bookings describe two different days so times may cross midnight.
        if data['start_date'] == data['end_date'] and data['start_time'] >= data['end_time']:
            raise serializers.ValidationError(
                "On a single-day schedule, end time must be after start time"
            )
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


class PetIncompatibilitySerializer(serializers.ModelSerializer):
    pet1_name = serializers.CharField(source='pet1.name', read_only=True)
    pet2_name = serializers.CharField(source='pet2.name', read_only=True)

    class Meta:
        model = PetIncompatibility
        fields = ['id', 'pet1', 'pet2', 'pet1_name', 'pet2_name', 'reason',
                  'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']
        # Disable DRF's auto-generated UniqueTogetherValidator: it would
        # check the un-normalised (pet1, pet2) and miss reverse-order
        # collisions. We do the canonical-pair uniqueness check by hand
        # in validate() below.
        validators = []

    def validate(self, attrs):
        pet1 = attrs.get('pet1') or getattr(self.instance, 'pet1', None)
        pet2 = attrs.get('pet2') or getattr(self.instance, 'pet2', None)
        if pet1 and pet2 and pet1.pk == pet2.pk:
            raise serializers.ValidationError(
                "A pet cannot be incompatible with itself."
            )
        # Order-independent uniqueness: collide on the canonical (lo, hi)
        # pair regardless of which order the client sent.
        if pet1 and pet2:
            lo, hi = sorted([pet1.pk, pet2.pk])
            qs = PetIncompatibility.objects.filter(pet1_id=lo, pet2_id=hi)
            if self.instance is not None:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    "An incompatibility rule already exists for this pet pair."
                )
        return attrs

    def create(self, validated_data):
        pet1, pet2 = validated_data['pet1'], validated_data['pet2']
        if pet1.pk > pet2.pk:
            validated_data['pet1'], validated_data['pet2'] = pet2, pet1
        return super().create(validated_data)

    def update(self, instance, validated_data):
        pet1 = validated_data.get('pet1', instance.pet1)
        pet2 = validated_data.get('pet2', instance.pet2)
        if pet1.pk > pet2.pk:
            validated_data['pet1'], validated_data['pet2'] = pet2, pet1
        return super().update(instance, validated_data)
