"""Per-entity history endpoints.

Each endpoint returns the full audit trail for a single tracked entity
ordered by ``-history_date``. Admin-only; non-admins receive 403,
unauthenticated requests receive 401.
"""
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin
from pets.models import MedicalNote, Owner, Pet, Vaccination

from .serializers import (
    MedicalNoteHistorySerializer,
    OwnerHistorySerializer,
    PetHistorySerializer,
    VaccinationHistorySerializer,
)


class _BaseHistoryView(APIView):
    """Common skeleton: admin-only auth + ordered queryset shape.

    Subclasses set ``model`` (the tracked Django model) and
    ``serializer_class`` (one of the per-model history serialisers).
    They override ``get_history_queryset`` to filter the manager by the
    URL kwargs.
    """

    permission_classes = [IsAuthenticated, IsAdmin]
    model = None
    serializer_class = None

    def get_history_queryset(self, **kwargs):  # pragma: no cover - abstract
        raise NotImplementedError

    def get(self, request, *args, **kwargs):
        # ``select_related('history_user')`` keeps the response a single
        # query regardless of how many rows the entity has accumulated.
        qs = self.get_history_queryset(**kwargs).select_related('history_user').order_by('-history_date')
        data = self.serializer_class(qs, many=True).data
        return Response(data)


@extend_schema(tags=['audit-log'], summary="Pet history")
class PetHistoryView(_BaseHistoryView):
    model = Pet
    serializer_class = PetHistorySerializer

    def get_history_queryset(self, **kwargs):
        get_object_or_404(Pet, pk=kwargs['pk'])
        return Pet.history.filter(id=kwargs['pk'])


@extend_schema(tags=['audit-log'], summary="Owner history")
class OwnerHistoryView(_BaseHistoryView):
    model = Owner
    serializer_class = OwnerHistorySerializer

    def get_history_queryset(self, **kwargs):
        get_object_or_404(Owner, pk=kwargs['pk'])
        return Owner.history.filter(id=kwargs['pk'])


@extend_schema(tags=['audit-log'], summary="Medical note history")
class MedicalNoteHistoryView(_BaseHistoryView):
    model = MedicalNote
    serializer_class = MedicalNoteHistorySerializer

    def get_history_queryset(self, **kwargs):
        # Resolve through the pet to preserve the URL nesting; admins
        # asking for "/pets/<bad>/medical-notes/<id>/history" should get
        # 404, not a stranger's note.
        get_object_or_404(MedicalNote, pk=kwargs['pk'], pet_id=kwargs['pet_id'])
        return MedicalNote.history.filter(id=kwargs['pk'])


@extend_schema(tags=['audit-log'], summary="Vaccination history")
class VaccinationHistoryView(_BaseHistoryView):
    model = Vaccination
    serializer_class = VaccinationHistorySerializer

    def get_history_queryset(self, **kwargs):
        get_object_or_404(Vaccination, pk=kwargs['pk'], pet_id=kwargs['pet_id'])
        return Vaccination.history.filter(id=kwargs['pk'])
