"""Per-entity history endpoints + a unified admin activity feed.

Per-entity views return the full audit trail for a single tracked
entity. The activity feed (``AuditLogActivityView``) returns a
chronologically merged stream across all tracked entities for the
admin /admin/activity page. All endpoints are admin-only; non-admins
receive 403, unauthenticated requests receive 401.
"""
from datetime import datetime

from django.shortcuts import get_object_or_404
from django.utils.dateparse import parse_datetime
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

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


# ── Unified activity feed ─────────────────────────────────────────────

# Registry of tracked entities. Adding a new entity to the audit feed
# = one dict entry: which historical manager to query and how to derive
# a human-readable label from a history row's snapshot.
TRACKED_ENTITIES = {
    'pet': {
        'manager': lambda: Pet.history,
        'label': lambda h: getattr(h, 'name', '') or '',
    },
    'owner': {
        'manager': lambda: Owner.history,
        'label': lambda h: ' '.join(filter(None, [
            getattr(h, 'first_name', '') or '',
            getattr(h, 'last_name', '') or '',
        ])).strip() or '',
    },
    'medical_note': {
        'manager': lambda: MedicalNote.history,
        'label': lambda h: getattr(h, 'title', '') or '',
    },
    'vaccination': {
        'manager': lambda: Vaccination.history,
        'label': lambda h: getattr(h, 'vax_type', '') or '',
    },
}

ACTION_VALUES = {'+', '~', '-'}
DEFAULT_LIMIT = 50
MAX_LIMIT = 200


def _parse_iso(value):
    """Parse an ISO timestamp from query params; return None on bad input."""
    if not value:
        return None
    try:
        dt = parse_datetime(value)
    except (TypeError, ValueError):
        return None
    return dt


@extend_schema(
    tags=['audit-log'],
    summary='Cross-entity activity feed',
    description=(
        'Chronologically merged stream of changes across all tracked '
        'entities (Pet, Owner, MedicalNote, Vaccination). Admin-only. '
        'Filterable by entity_type, action, user, and date range.'
    ),
)
class AuditLogActivityView(APIView):
    """Cross-entity, paginated activity feed for /admin/activity."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, *args, **kwargs):
        params = request.query_params

        # ── Filter parsing + validation ────────────────────────────
        entity_type = params.get('entity_type')
        if entity_type and entity_type not in TRACKED_ENTITIES:
            return Response(
                {'detail': f'Unknown entity_type: {entity_type}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        action = params.get('action')
        if action and action not in ACTION_VALUES:
            return Response(
                {'detail': f'Unknown action: {action}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_id = params.get('user')
        if user_id is not None:
            try:
                user_id = int(user_id)
            except (TypeError, ValueError):
                return Response(
                    {'detail': 'user must be an integer'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        since_raw = params.get('since')
        since = _parse_iso(since_raw)
        if since_raw and since is None:
            return Response(
                {'detail': 'since must be ISO 8601 timestamp'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        until_raw = params.get('until')
        until = _parse_iso(until_raw)
        if until_raw and until is None:
            return Response(
                {'detail': 'until must be ISO 8601 timestamp'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            limit = int(params.get('limit', DEFAULT_LIMIT))
            offset = int(params.get('offset', 0))
        except (TypeError, ValueError):
            return Response(
                {'detail': 'limit/offset must be integers'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if offset < 0:
            return Response(
                {'detail': 'offset must be >= 0'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Silent clamp: keep limit in [1, MAX_LIMIT] without erroring;
        # the UI shouldn't ever submit anything outside, but a curl
        # caller asking for limit=10000 should just get 200 rows.
        limit = max(1, min(limit, MAX_LIMIT))

        # ── Per-entity query + Python merge ───────────────────────
        kinds = [entity_type] if entity_type else list(TRACKED_ENTITIES.keys())

        rows = []
        total = 0
        for kind in kinds:
            qs = TRACKED_ENTITIES[kind]['manager']()
            if user_id is not None:
                qs = qs.filter(history_user_id=user_id)
            if action:
                qs = qs.filter(history_type=action)
            if since:
                qs = qs.filter(history_date__gte=since)
            if until:
                qs = qs.filter(history_date__lte=until)

            total += qs.count()
            # Pull (offset + limit) per entity so the merge has enough
            # rows to fill the requested page after sorting.
            head = (
                qs.select_related('history_user')
                .order_by('-history_date')[: offset + limit]
            )
            label_fn = TRACKED_ENTITIES[kind]['label']
            for h in head:
                rows.append({
                    'entity_type': kind,
                    'entity_id': h.id,
                    'entity_label': label_fn(h),
                    'history_id': h.history_id,
                    'history_type': h.history_type,
                    'history_date': h.history_date,
                    'history_user': (
                        {'id': h.history_user.id, 'email': h.history_user.email}
                        if h.history_user_id and h.history_user
                        else None
                    ),
                })

        # Merge across entities and slice the requested page.
        rows.sort(key=lambda r: r['history_date'], reverse=True)
        page = rows[offset: offset + limit]

        # Serialize datetimes as ISO 8601.
        for row in page:
            d = row['history_date']
            if isinstance(d, datetime):
                row['history_date'] = d.isoformat()

        return Response({'count': total, 'results': page})
