"""Serialisers for django-simple-history rows.

The history models are auto-generated mirrors of the live entities plus
four ``history_*`` columns. We expose those columns plus a small
denormalised ``history_user`` block (id + email) so admins viewing the
log don't need a second round-trip per row.
"""
from rest_framework import serializers


class HistoryUserSerializer(serializers.Serializer):
    """Compact user shape returned alongside each history row."""

    id = serializers.IntegerField()
    email = serializers.EmailField()


class HistorySerializer(serializers.Serializer):
    """Common shape returned by every per-entity history endpoint.

    Subclasses add a ``snapshot`` field that mirrors the live entity's
    serializer; this base only handles the ``history_*`` columns, which
    look identical for every tracked model.
    """

    history_id = serializers.IntegerField()
    history_date = serializers.DateTimeField()
    history_type = serializers.CharField()
    history_change_reason = serializers.CharField(allow_null=True, allow_blank=True)
    history_user = serializers.SerializerMethodField()
    snapshot = serializers.SerializerMethodField()

    snapshot_fields: tuple = ()

    def get_history_user(self, obj):
        if obj.history_user_id is None:
            return None
        # history_user is a real FK on the historical row; reading it is
        # a single query but the queryset prefetches it.
        user = obj.history_user
        if user is None:
            return None
        return {'id': user.id, 'email': user.email}

    def get_snapshot(self, obj):
        return {field: getattr(obj, field, None) for field in self.snapshot_fields}


class PetHistorySerializer(HistorySerializer):
    snapshot_fields = (
        'id', 'name', 'species', 'breed', 'age', 'temperament',
        'dominance_level', 'size', 'neutered', 'sex', 'birth_date',
        'weight', 'last_internal_deworming_date', 'last_external_deworming_date',
        'special_notes', 'owner_id', 'vet_override_id',
    )


class OwnerHistorySerializer(HistorySerializer):
    snapshot_fields = (
        'id', 'first_name', 'last_name', 'email', 'phone', 'id_number',
        'birth_date', 'emergency_contact', 'emergency_phone',
        'emergency_contact_can_pickup', 'notes',
        'primary_vet_id', 'emergency_vet_id',
        'street', 'city', 'state', 'province', 'country',
    )


class MedicalNoteHistorySerializer(HistorySerializer):
    snapshot_fields = ('id', 'title', 'description', 'pet_id')


class VaccinationHistorySerializer(HistorySerializer):
    snapshot_fields = ('id', 'pet_id', 'vax_type', 'date')
