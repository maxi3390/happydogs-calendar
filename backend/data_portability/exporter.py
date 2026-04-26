"""Serialise the operator's domain data to a single file.

Spec: ``openspec/specs/backend/data-portability/spec.md``. The exporter is
the read side of the round-trip; see ``importer.py`` for the write side.
Keep the two in sync — the entity order, field lists, and envelope
version are the shared contract.
"""
from __future__ import annotations

import csv
import io
import json
import zipfile
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from django.db import models

from nursery_settings.models import NurserySetting
from pets.models import (
    MedicalNote,
    Owner,
    Pet,
    Schedule,
    Vaccination,
    VaccinationType,
    Vet,
)

# Envelope version used by both JSON and CSV ZIP. Bump this — and teach the
# importer to recognise the new value — when the schema evolves in a
# non-backward-compatible way (e.g. a field rename, a new required column).
ENVELOPE_VERSION = 1

# Entity order = forward FK-dependency order. The importer walks this
# forward when inserting and in reverse when deleting.
ENTITY_ORDER: list[tuple[str, type[models.Model], list[str]]] = [
    # (envelope key, model class, field names)
    (
        'nursery_settings',
        NurserySetting,
        ['id', 'daily_booking_limit', 'updated_at'],
    ),
    (
        'vaccination_types',
        VaccinationType,
        ['id', 'name', 'label', 'enabled', 'order', 'created_at', 'updated_at'],
    ),
    (
        'vets',
        Vet,
        [
            'id', 'name', 'phone', 'email',
            'street', 'city', 'state', 'province', 'country',
            'notes', 'created_at', 'updated_at',
        ],
    ),
    (
        'owners',
        Owner,
        [
            'id', 'first_name', 'last_name', 'email', 'phone', 'id_number',
            'street', 'city', 'state', 'province', 'country', 'birth_date',
            'emergency_contact', 'emergency_phone', 'emergency_contact_can_pickup',
            'notes', 'primary_vet', 'emergency_vet',
            'created_at', 'updated_at',
        ],
    ),
    (
        'pets',
        Pet,
        [
            'id', 'name', 'species', 'breed', 'age', 'temperament',
            'dominance_level', 'size', 'neutered', 'sex', 'birth_date',
            'weight', 'special_notes', 'owner', 'vet_override',
            'created_at', 'updated_at',
        ],
    ),
    (
        'vaccinations',
        Vaccination,
        ['id', 'pet', 'vax_type', 'date', 'created_at'],
    ),
    (
        'medical_notes',
        MedicalNote,
        ['id', 'pet', 'title', 'description', 'created_at', 'updated_at'],
    ),
    (
        'schedules',
        Schedule,
        [
            'id', 'pet', 'start_date', 'end_date', 'start_time', 'end_time',
            'status', 'notes', 'created_at', 'updated_at',
        ],
    ),
]


def _field_value(instance: models.Model, field_name: str) -> Any:
    """Read a field without triggering related-object fetches.

    Using ``{field}_id`` for FKs keeps the export a plain-id graph (which
    the importer then stitches back together) instead of nested objects,
    and avoids an extra query per row.
    """
    model_cls = type(instance)
    try:
        field = model_cls._meta.get_field(field_name)
    except Exception:
        field = None

    if isinstance(field, models.ForeignKey):
        return getattr(instance, f'{field_name}_id')
    return getattr(instance, field_name)


def _to_json_primitive(value: Any) -> Any:
    """Serialise a field value using JSON-native types where possible."""
    if value is None or isinstance(value, (bool, int, str)):
        return value
    if isinstance(value, float):
        return value
    if isinstance(value, Decimal):
        # Decimal as string preserves precision across the round-trip.
        return str(value)
    # datetime / date / time all have isoformat(); fall back to str() for the rest.
    isoformat = getattr(value, 'isoformat', None)
    if callable(isoformat):
        return isoformat()
    return str(value)


def _row_as_dict(instance: models.Model, fields: list[str]) -> dict[str, Any]:
    return {name: _to_json_primitive(_field_value(instance, name)) for name in fields}


def _to_csv_cell(value: Any) -> str:
    """CSV cells are strings. NULL == empty string, everything else uses the JSON primitive form."""
    if value is None:
        return ''
    v = _to_json_primitive(value)
    if isinstance(v, bool):
        return 'true' if v else 'false'
    return str(v)


# ── JSON export ──────────────────────────────────────────────────────────────

def export_json() -> bytes:
    """Return the full data export as a JSON envelope (UTF-8 bytes)."""
    entities: dict[str, list[dict[str, Any]]] = {}
    for key, model_cls, fields in ENTITY_ORDER:
        rows = [
            _row_as_dict(instance, fields)
            for instance in model_cls.objects.order_by('pk')
        ]
        entities[key] = rows

    envelope = {
        'version': ENVELOPE_VERSION,
        'exported_at': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
        'generator': f'happy-calendar data_portability v{ENVELOPE_VERSION}',
        'entities': entities,
    }
    # `sort_keys=False` so we preserve insertion order — the file reads
    # top-to-bottom in the same order as the importer's forward pass.
    return json.dumps(envelope, indent=2, ensure_ascii=False).encode('utf-8')


# ── CSV ZIP export ───────────────────────────────────────────────────────────

def export_zip() -> bytes:
    """Return the full data export as a ZIP of per-entity CSV files."""
    buffer = io.BytesIO()
    file_list: list[str] = []

    with zipfile.ZipFile(buffer, mode='w', compression=zipfile.ZIP_DEFLATED) as zf:
        for key, model_cls, fields in ENTITY_ORDER:
            csv_name = f'{key}.csv'
            file_list.append(csv_name)

            text_buffer = io.StringIO()
            writer = csv.writer(text_buffer, quoting=csv.QUOTE_MINIMAL)
            writer.writerow(fields)
            for instance in model_cls.objects.order_by('pk'):
                writer.writerow([_to_csv_cell(_field_value(instance, name)) for name in fields])

            zf.writestr(csv_name, text_buffer.getvalue())

        manifest = {
            'version': ENVELOPE_VERSION,
            'exported_at': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
            'generator': f'happy-calendar data_portability v{ENVELOPE_VERSION}',
            'files': file_list,
        }
        zf.writestr('manifest.json', json.dumps(manifest, indent=2, ensure_ascii=False))

    return buffer.getvalue()


# ── Convenience: in-memory filename factory ──────────────────────────────────

def suggested_filename(extension: str) -> str:
    """Return a timestamped filename for the browser's `Save As` prompt."""
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    return f'happy-calendar-backup-{stamp}.{extension}'


# Public API — the view layer uses only these.
__all__ = [
    'ENVELOPE_VERSION',
    'ENTITY_ORDER',
    'export_json',
    'export_zip',
    'suggested_filename',
]
