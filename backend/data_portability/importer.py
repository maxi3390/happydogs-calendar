"""Restore the operator's domain data from a previously exported file.

Mirror of ``exporter.py``. Import semantics are **replace**: the importer
wipes every in-scope entity and re-inserts the payload inside a single
atomic transaction. Any error rolls the whole thing back.

Spec: ``openspec/specs/backend/data-portability/spec.md``.
"""
from __future__ import annotations

import csv
import io
import json
import zipfile
from dataclasses import dataclass
from datetime import date, datetime, time
from decimal import Decimal, InvalidOperation
from typing import Any, BinaryIO

from django.db import models, transaction

from .exporter import ENTITY_ORDER, ENVELOPE_VERSION


class ImportValidationError(Exception):
    """Raised when the payload is malformed, unversioned, or references unknown rows.

    Attributes are surfaced verbatim by the view layer as a structured
    400 response so the frontend can highlight the offending entity/row.
    """

    def __init__(
        self,
        detail: str,
        *,
        entity: str | None = None,
        row_index: int | None = None,
    ):
        super().__init__(detail)
        self.detail = detail
        self.entity = entity
        self.row_index = row_index

    def as_dict(self) -> dict[str, Any]:
        return {
            'detail': 'Import failed',
            'entity': self.entity,
            'row_index': self.row_index,
            'error': self.detail,
        }


@dataclass
class ImportSummary:
    """Counts of rows imported per entity. Rendered as JSON in the response."""
    counts: dict[str, int]

    def to_dict(self) -> dict[str, Any]:
        return {'counts': self.counts, 'version': ENVELOPE_VERSION}


# Fields that the importer deliberately ignores when building model instances.
# `auto_now` / `auto_now_add` always wins at save time, so we'd just be
# fighting Django. Every other field is round-tripped.
_TIMESTAMP_FIELDS = {'created_at', 'updated_at'}


# ─────────────────────────────────────────────────────────────────────────────
# Format detection
# ─────────────────────────────────────────────────────────────────────────────

def _detect_format(head: bytes) -> str:
    """Return 'json' | 'zip' | raise ImportValidationError."""
    stripped = head.lstrip()
    if stripped.startswith(b'{'):
        return 'json'
    if head.startswith(b'PK\x03\x04'):
        return 'zip'
    raise ImportValidationError(
        'Unrecognised file format. Expected JSON (starts with "{") '
        'or ZIP (starts with "PK").'
    )


# ─────────────────────────────────────────────────────────────────────────────
# Field coercion
# ─────────────────────────────────────────────────────────────────────────────

def _coerce(model_cls: type[models.Model], field_name: str, raw: Any) -> Any:
    """Convert ``raw`` (JSON-native or CSV string) to a Django-model-friendly value.

    Raises ImportValidationError with a human-readable message on bad input.
    """
    field = model_cls._meta.get_field(field_name)

    # Empty / null handling.
    if raw is None or raw == '':
        if getattr(field, 'null', False):
            return None
        if isinstance(field, (models.CharField, models.TextField)) and field.blank:
            return ''
        if field.has_default():
            return field.get_default()
        # Fall through — the save() call will raise IntegrityError with a
        # clearer message than we can compose here.
        return None

    # FK: return an int so we can assign to `<name>_id`.
    if isinstance(field, models.ForeignKey):
        try:
            return int(raw)
        except (TypeError, ValueError) as exc:
            raise ImportValidationError(f'Invalid FK id for {field_name!r}: {raw!r}') from exc

    if isinstance(field, models.BooleanField):
        if isinstance(raw, bool):
            return raw
        if isinstance(raw, str):
            return raw.strip().lower() in ('true', '1', 'yes', 'on')
        return bool(raw)

    if isinstance(field, models.DecimalField):
        try:
            return Decimal(str(raw))
        except (InvalidOperation, TypeError) as exc:
            raise ImportValidationError(f'Invalid decimal for {field_name!r}: {raw!r}') from exc

    if isinstance(field, models.IntegerField):
        try:
            return int(raw)
        except (TypeError, ValueError) as exc:
            raise ImportValidationError(f'Invalid integer for {field_name!r}: {raw!r}') from exc

    if isinstance(field, models.FloatField):
        return float(raw)

    # Order matters: DateTimeField subclasses DateField, TimeField does not.
    if isinstance(field, models.DateTimeField):
        if isinstance(raw, datetime):
            return raw
        text = str(raw).replace('Z', '+00:00')
        try:
            return datetime.fromisoformat(text)
        except ValueError as exc:
            raise ImportValidationError(f'Invalid datetime for {field_name!r}: {raw!r}') from exc

    if isinstance(field, models.DateField):
        if isinstance(raw, date) and not isinstance(raw, datetime):
            return raw
        try:
            return date.fromisoformat(str(raw))
        except ValueError as exc:
            raise ImportValidationError(f'Invalid date for {field_name!r}: {raw!r}') from exc

    if isinstance(field, models.TimeField):
        if isinstance(raw, time):
            return raw
        try:
            return time.fromisoformat(str(raw))
        except ValueError as exc:
            raise ImportValidationError(f'Invalid time for {field_name!r}: {raw!r}') from exc

    # Fallback: strings, JSONField, etc. — pass through as-is.
    return raw


def _build_instance(
    model_cls: type[models.Model],
    fields: list[str],
    row: dict[str, Any],
    *,
    entity_key: str,
    row_index: int,
) -> models.Model:
    """Instantiate ``model_cls`` from a row dict, coercing each field."""
    kwargs: dict[str, Any] = {}
    for name in fields:
        if name in _TIMESTAMP_FIELDS:
            # auto_now / auto_now_add will fill these in. Skip to avoid pointless work.
            continue
        if name not in row:
            raise ImportValidationError(
                f'Missing field {name!r}',
                entity=entity_key,
                row_index=row_index,
            )
        try:
            value = _coerce(model_cls, name, row[name])
        except ImportValidationError as exc:
            exc.entity = entity_key
            exc.row_index = row_index
            raise

        field = model_cls._meta.get_field(name)
        if isinstance(field, models.ForeignKey):
            kwargs[f'{name}_id'] = value
        else:
            kwargs[name] = value
    return model_cls(**kwargs)


# ─────────────────────────────────────────────────────────────────────────────
# Payload extraction (JSON and ZIP funnel into the same shape)
# ─────────────────────────────────────────────────────────────────────────────

def _extract_json_payload(file: BinaryIO) -> dict[str, list[dict[str, Any]]]:
    try:
        envelope = json.loads(file.read().decode('utf-8'))
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise ImportValidationError(f'Malformed JSON: {exc}') from exc
    _require_version(envelope.get('version'))
    entities = envelope.get('entities')
    if not isinstance(entities, dict):
        raise ImportValidationError('Envelope is missing an `entities` object.')
    return entities


def _extract_zip_payload(file: BinaryIO) -> dict[str, list[dict[str, Any]]]:
    try:
        zf = zipfile.ZipFile(file)
    except zipfile.BadZipFile as exc:
        raise ImportValidationError(f'Malformed ZIP: {exc}') from exc
    with zf:
        if 'manifest.json' not in zf.namelist():
            raise ImportValidationError('ZIP is missing manifest.json')
        try:
            manifest = json.loads(zf.read('manifest.json').decode('utf-8'))
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            raise ImportValidationError(f'Malformed manifest.json: {exc}') from exc
        _require_version(manifest.get('version'))

        entities: dict[str, list[dict[str, Any]]] = {}
        for key, _model_cls, fields in ENTITY_ORDER:
            csv_name = f'{key}.csv'
            if csv_name not in zf.namelist():
                raise ImportValidationError(
                    f'ZIP is missing required file {csv_name!r}',
                    entity=key,
                )
            text = zf.read(csv_name).decode('utf-8')
            entities[key] = _csv_text_to_rows(text, fields, entity_key=key)
    return entities


def _csv_text_to_rows(
    text: str,
    fields: list[str],
    *,
    entity_key: str,
) -> list[dict[str, Any]]:
    reader = csv.reader(io.StringIO(text))
    try:
        header = next(reader)
    except StopIteration:
        # Empty file — treat as zero rows with no header (allowed).
        return []
    if header != fields:
        raise ImportValidationError(
            f'CSV header does not match expected columns. Got {header!r}, expected {fields!r}.',
            entity=entity_key,
        )
    rows: list[dict[str, Any]] = []
    for row in reader:
        if len(row) != len(fields):
            raise ImportValidationError(
                f'Row has {len(row)} columns, expected {len(fields)}.',
                entity=entity_key,
                row_index=len(rows),
            )
        rows.append(dict(zip(fields, row)))
    return rows


def _require_version(version: Any) -> None:
    if version != ENVELOPE_VERSION:
        raise ImportValidationError(
            f'Unsupported envelope version {version!r}; '
            f'this server understands version {ENVELOPE_VERSION}.'
        )


# ─────────────────────────────────────────────────────────────────────────────
# Public entrypoint
# ─────────────────────────────────────────────────────────────────────────────

def import_file(file: BinaryIO) -> ImportSummary:
    """Replace the DB state with the contents of ``file``.

    The file handle is consumed — callers must pass a fresh one (or a
    ``BytesIO`` seeded from memory) per call.
    """
    head = file.read(4)
    file.seek(0)

    fmt = _detect_format(head)
    entities = (
        _extract_json_payload(file)
        if fmt == 'json'
        else _extract_zip_payload(file)
    )

    # Validate every required entity is present BEFORE we start deleting so a
    # partial / truncated upload never half-wipes the DB.
    missing = [key for key, _, _ in ENTITY_ORDER if key not in entities]
    if missing:
        raise ImportValidationError(
            f'Payload is missing entities: {", ".join(missing)}',
        )

    counts: dict[str, int] = {}

    # Pre-validate FK integrity before we touch the DB. Collect the set of
    # incoming PKs for each entity, then walk each entity's FK fields and
    # assert that every FK value is either None or in the target entity's
    # set. SQLite defers FK checks to transaction commit, which would let
    # a malformed payload slip past bulk_create and only blow up at the
    # end of the atomic block; doing it explicitly here gives us a clean
    # ImportValidationError with (entity, row_index) context.
    model_to_entity_key: dict[type[models.Model], str] = {
        model_cls: key for key, model_cls, _ in ENTITY_ORDER
    }
    pk_sets: dict[str, set[int]] = {}
    for key, model_cls, fields in ENTITY_ORDER:
        rows = entities.get(key)
        if not isinstance(rows, list):
            raise ImportValidationError(
                f'Entity payload for {key!r} is not a list.',
                entity=key,
            )
        pks: set[int] = set()
        for idx, row in enumerate(rows):
            raw_pk = row.get('id')
            if raw_pk is None:
                raise ImportValidationError(
                    'Row is missing an `id`.', entity=key, row_index=idx,
                )
            try:
                pks.add(int(raw_pk))
            except (TypeError, ValueError) as exc:
                raise ImportValidationError(
                    f'Row id is not an integer: {raw_pk!r}',
                    entity=key, row_index=idx,
                ) from exc
        pk_sets[key] = pks

    for key, model_cls, fields in ENTITY_ORDER:
        rows = entities[key]
        for idx, row in enumerate(rows):
            for name in fields:
                field = model_cls._meta.get_field(name)
                if not isinstance(field, models.ForeignKey):
                    continue
                raw = row.get(name)
                if raw in (None, ''):
                    continue
                target_key = model_to_entity_key.get(field.related_model)
                if target_key is None:
                    # FK points at a model we don't export (e.g. a future
                    # extension). Skip validation — let the DB catch it.
                    continue
                try:
                    target_pk = int(raw)
                except (TypeError, ValueError) as exc:
                    raise ImportValidationError(
                        f'FK {name!r} is not an integer: {raw!r}',
                        entity=key, row_index=idx,
                    ) from exc
                if target_pk not in pk_sets[target_key]:
                    raise ImportValidationError(
                        f'FK {name!r} = {target_pk} not present in payload '
                        f'for entity {target_key!r}.',
                        entity=key, row_index=idx,
                    )

    with transaction.atomic():
        # Delete in reverse FK-dependency order so cascades never hit a
        # not-yet-deleted parent.
        for key, model_cls, _fields in reversed(ENTITY_ORDER):
            model_cls.objects.all().delete()

        # Re-insert in forward order. We materialise each list first (in
        # memory) so a validation error in row 42 aborts before we've
        # written anything for this entity.
        for key, model_cls, fields in ENTITY_ORDER:
            rows = entities[key]
            instances = [
                _build_instance(model_cls, fields, row, entity_key=key, row_index=idx)
                for idx, row in enumerate(rows)
            ]
            if instances:
                model_cls.objects.bulk_create(instances)
            counts[key] = len(instances)

    return ImportSummary(counts=counts)


__all__ = ['import_file', 'ImportSummary', 'ImportValidationError']
