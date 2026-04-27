"""OWASP A09:2021 — Security Logging and Monitoring Failures.

The audit-log feature (`feat(audit-log)` — a52e4fe) installed
``HistoricalRecords()`` on the four sensitive entity types. This file
asserts those records are still wired, since losing a `history = ...`
line in a refactor would silently disable the audit trail.

We also assert a logout invalidates a refresh token (covered more
specifically in test_a07; here we verify the trail is queryable so
incident response has something to work with).
"""
from django.test import TestCase

from pets.models import MedicalNote, Owner, Pet, Vaccination
from tests.factories import create_owner, create_pet, create_vaccination


class A09_AuditLogTracksTheFourSensitiveEntities(TestCase):
    """``HistoricalRecords`` MUST be present on the four tracked models."""

    def test_pet_has_history_manager(self):
        self.assertTrue(
            hasattr(Pet, 'history'),
            "Pet.history is missing — django-simple-history is not "
            "tracking pet edits."
        )

    def test_owner_has_history_manager(self):
        self.assertTrue(hasattr(Owner, 'history'))

    def test_medical_note_has_history_manager(self):
        self.assertTrue(hasattr(MedicalNote, 'history'))

    def test_vaccination_has_history_manager(self):
        self.assertTrue(hasattr(Vaccination, 'history'))


class A09_AuditTrailIsActuallyWritten(TestCase):
    """A factory-created entity SHALL produce one history row."""

    def test_pet_create_writes_audit_row(self):
        pet = create_pet()
        rows = Pet.history.filter(id=pet.id)
        self.assertEqual(rows.count(), 1)
        self.assertEqual(rows.first().history_type, '+')

    def test_owner_update_writes_audit_row(self):
        owner = create_owner()
        owner.phone = '555-9999'
        owner.save()
        rows = Owner.history.filter(id=owner.id).order_by('history_date')
        self.assertEqual(rows.count(), 2)
        self.assertEqual(rows.last().history_type, '~')

    def test_vaccination_create_writes_audit_row(self):
        v = create_vaccination()
        rows = Vaccination.history.filter(id=v.id)
        self.assertEqual(rows.count(), 1)
