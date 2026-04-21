"""Tests for the data-portability export / import round-trip."""
from __future__ import annotations

import csv
import io
import json
import zipfile
from datetime import date, time

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

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
from tests.factories import (
    create_and_auth_user,
    create_owner,
    create_pet,
    create_vet,
)

from data_portability.exporter import ENTITY_ORDER, export_json, export_zip
from data_portability.importer import ImportValidationError, import_file


def _seed_fixture() -> dict[str, int]:
    """Create a small, cross-referencing dataset and return the row counts."""
    NurserySetting.load()

    vax = VaccinationType.objects.create(
        name='rabies-test', label='Rabies (test)', enabled=True, order=1,
    )
    vet = create_vet(name='Round-trip Clinic')
    owner = create_owner(
        email='rt@example.com',
        first_name='Round', last_name='Trip',
        primary_vet=vet, emergency_vet=vet,
    )
    pet = create_pet(
        owner=owner, name='Kepler',
        vet_override=vet,
        weight='3.14',
    )
    Vaccination.objects.create(pet=pet, vax_type=vax.name, date=date(2026, 3, 1))
    MedicalNote.objects.create(pet=pet, title='Allergy', description='Peanuts')
    Schedule.objects.create(
        pet=pet,
        start_date=date(2026, 4, 20), end_date=date(2026, 4, 20),
        start_time=time(9, 0), end_time=time(17, 0),
        status='scheduled', notes='',
    )

    return _current_counts()


def _current_counts() -> dict[str, int]:
    return {
        'nursery_settings': NurserySetting.objects.count(),
        'vaccination_types': VaccinationType.objects.count(),
        'vets': Vet.objects.count(),
        'owners': Owner.objects.count(),
        'pets': Pet.objects.count(),
        'vaccinations': Vaccination.objects.count(),
        'medical_notes': MedicalNote.objects.count(),
        'schedules': Schedule.objects.count(),
    }


def _wipe_all() -> None:
    """Mirror the importer's deletion order for clean test setup."""
    for _, model_cls, _ in reversed(ENTITY_ORDER):
        model_cls.objects.all().delete()


class ExporterTests(TestCase):

    def test_json_envelope_shape(self):
        _seed_fixture()
        payload = json.loads(export_json().decode('utf-8'))
        self.assertEqual(payload['version'], 1)
        self.assertIn('exported_at', payload)
        self.assertIn('entities', payload)
        for key, _model_cls, _fields in ENTITY_ORDER:
            self.assertIn(key, payload['entities'])

    def test_export_is_deterministic(self):
        _seed_fixture()
        first = export_json()
        second = export_json()
        # `exported_at` differs by sub-second on each call, so extract it and
        # compare the rest. The entities array itself must be byte-identical.
        a = json.loads(first)
        b = json.loads(second)
        a.pop('exported_at')
        b.pop('exported_at')
        self.assertEqual(a, b)

    def test_zip_contains_expected_files(self):
        _seed_fixture()
        blob = export_zip()
        with zipfile.ZipFile(io.BytesIO(blob)) as zf:
            names = set(zf.namelist())
        expected = {'manifest.json'} | {f'{key}.csv' for key, _, _ in ENTITY_ORDER}
        self.assertEqual(names, expected)

    def test_zip_csv_headers_match_field_lists(self):
        _seed_fixture()
        blob = export_zip()
        with zipfile.ZipFile(io.BytesIO(blob)) as zf:
            for key, _model_cls, fields in ENTITY_ORDER:
                text = zf.read(f'{key}.csv').decode('utf-8')
                reader = csv.reader(io.StringIO(text))
                header = next(reader, None)
                self.assertEqual(header, fields, f'{key} header mismatch')


class JsonRoundTripTests(TestCase):

    def test_full_round_trip_preserves_counts_and_references(self):
        _seed_fixture()
        pre_counts = _current_counts()

        payload = export_json()
        _wipe_all()
        self.assertEqual(_current_counts(), {k: 0 for k in pre_counts})

        summary = import_file(io.BytesIO(payload))
        self.assertEqual(summary.counts, pre_counts)
        self.assertEqual(_current_counts(), pre_counts)

        # FKs survived the round-trip: the owner still points at the same vet,
        # and the pet still has the vet_override.
        owner = Owner.objects.get(email='rt@example.com')
        self.assertIsNotNone(owner.primary_vet_id)
        self.assertEqual(owner.primary_vet.name, 'Round-trip Clinic')

        pet = Pet.objects.get(name='Kepler')
        self.assertEqual(pet.vet_override_id, owner.primary_vet_id)


class ZipRoundTripTests(TestCase):

    def test_full_round_trip_preserves_counts(self):
        _seed_fixture()
        pre_counts = _current_counts()

        blob = export_zip()
        _wipe_all()
        self.assertEqual(_current_counts(), {k: 0 for k in pre_counts})

        import_file(io.BytesIO(blob))
        self.assertEqual(_current_counts(), pre_counts)


class FormatDetectionTests(TestCase):

    def test_unknown_bytes_raise(self):
        with self.assertRaises(ImportValidationError) as ctx:
            import_file(io.BytesIO(b'hello world, not a valid backup'))
        self.assertIn('Unrecognised file format', str(ctx.exception.detail))


class ImportAtomicityTests(TestCase):

    def test_fk_pointing_at_missing_owner_rolls_back(self):
        # Seed something that would survive if the import weren't atomic.
        pre_counts = _seed_fixture()
        envelope = json.loads(export_json().decode('utf-8'))

        # Corrupt the payload: a pet that references a non-existent owner id.
        envelope['entities']['pets'][0]['owner'] = 999_999

        buffer = io.BytesIO(json.dumps(envelope).encode('utf-8'))
        with self.assertRaises(ImportValidationError) as ctx:
            import_file(buffer)
        self.assertEqual(ctx.exception.entity, 'pets')
        self.assertEqual(ctx.exception.row_index, 0)

        # Atomicity: the DB should still have exactly what we started with.
        self.assertEqual(_current_counts(), pre_counts)


class VersionMismatchTests(TestCase):

    def test_unknown_version_rejected(self):
        buffer = io.BytesIO(json.dumps({'version': 99, 'entities': {}}).encode('utf-8'))
        with self.assertRaises(ImportValidationError) as ctx:
            import_file(buffer)
        self.assertIn('Unsupported envelope version', ctx.exception.detail)


class MissingEntityTests(TestCase):

    def test_partial_payload_rejected_before_wipe(self):
        _seed_fixture()
        pre_counts = _current_counts()

        # Valid version but missing several entity keys.
        buffer = io.BytesIO(json.dumps({
            'version': 1,
            'entities': {'nursery_settings': []},
        }).encode('utf-8'))
        with self.assertRaises(ImportValidationError) as ctx:
            import_file(buffer)
        self.assertIn('missing entities', ctx.exception.detail)

        # The partial validation happens before any deletion.
        self.assertEqual(_current_counts(), pre_counts)


class ExportEndpointTests(APITestCase):

    def setUp(self):
        self.user = create_and_auth_user(self.client)
        self.json_url = reverse('data_portability_export_json')
        self.csv_url = reverse('data_portability_export_csv')

    def test_requires_auth(self):
        self.client.credentials()
        for url in (self.json_url, self.csv_url):
            response = self.client.get(url)
            self.assertIn(response.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_json_export(self):
        _seed_fixture()
        response = self.client.get(self.json_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/json')
        self.assertIn('attachment', response['Content-Disposition'])
        payload = json.loads(response.content)
        self.assertEqual(payload['version'], 1)

    def test_csv_export_returns_zip(self):
        _seed_fixture()
        response = self.client.get(self.csv_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/zip')
        with zipfile.ZipFile(io.BytesIO(response.content)) as zf:
            self.assertIn('manifest.json', zf.namelist())


class ImportEndpointTests(APITestCase):

    def setUp(self):
        self.user = create_and_auth_user(self.client)
        self.url = reverse('data_portability_import')

    def test_requires_auth(self):
        self.client.credentials()
        response = self.client.post(self.url)
        self.assertIn(response.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_round_trip_via_http(self):
        _seed_fixture()
        pre_counts = _current_counts()
        blob = export_json()

        _wipe_all()

        response = self.client.post(
            self.url,
            {'file': io.BytesIO(blob)},
            format='multipart',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(response.data['counts'], pre_counts)
        self.assertEqual(_current_counts(), pre_counts)

    def test_missing_file(self):
        response = self.client.post(self.url, {}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_bytes(self):
        response = self.client.post(
            self.url,
            {'file': io.BytesIO(b'not a valid backup')},
            format='multipart',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Unrecognised file format', response.data['error'])
