"""History-row generation tests.

Asserts that the four tracked models accumulate one history row per
save (insert / update / delete) and that ``history_user`` is populated
correctly when the change goes through the request middleware.
"""
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status

from pets.models import MedicalNote, Owner, Pet, Vaccination
from tests.factories import (
    auth_client, create_admin, create_owner, create_pet, create_vaccination,
)


class HistoryRowGenerationTests(APITestCase):
    """Direct ORM saves create the expected history rows."""

    def test_pet_create_records_plus_row(self):
        pet = create_pet()
        rows = list(Pet.history.filter(id=pet.id))
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].history_type, '+')

    def test_pet_update_records_tilde_row(self):
        pet = create_pet(temperament='playful')
        pet.temperament = 'calm'
        pet.save()
        rows = list(Pet.history.filter(id=pet.id).order_by('history_date'))
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0].history_type, '+')
        self.assertEqual(rows[1].history_type, '~')
        self.assertEqual(rows[1].temperament, 'calm')

    def test_pet_delete_records_minus_row(self):
        pet = create_pet()
        pet_id = pet.id
        pet.delete()
        rows = list(Pet.history.filter(id=pet_id).order_by('history_date'))
        # The minus row is the last one for the deleted entity.
        self.assertEqual(rows[-1].history_type, '-')

    def test_owner_update_records_tilde_row(self):
        owner = create_owner()
        owner.phone = '555-9999'
        owner.save()
        rows = list(Owner.history.filter(id=owner.id))
        self.assertEqual(len(rows), 2)
        # Most recent first via the simple_history default ordering.
        self.assertEqual(rows[0].history_type, '~')
        self.assertEqual(rows[0].phone, '555-9999')

    def test_medical_note_history(self):
        pet = create_pet()
        note = MedicalNote.objects.create(pet=pet, title='Allergy', description='Peanuts')
        note.description = 'Peanuts and eggs'
        note.save()
        rows = list(MedicalNote.history.filter(id=note.id).order_by('history_date'))
        self.assertEqual([r.history_type for r in rows], ['+', '~'])
        self.assertEqual(rows[1].description, 'Peanuts and eggs')

    def test_vaccination_history(self):
        v = create_vaccination()
        v.vax_type = 'distemper'
        v.save()
        rows = list(Vaccination.history.filter(id=v.id).order_by('history_date'))
        self.assertEqual([r.history_type for r in rows], ['+', '~'])
        self.assertEqual(rows[1].vax_type, 'distemper')


class HistoryUserAttributionTests(APITestCase):
    """The HistoryRequestMiddleware records the calling user on each row."""

    def test_history_user_set_via_request_middleware(self):
        admin = create_admin()
        password = 'AdminPass123!'
        admin.set_password(password)
        admin.save()
        auth_client(self.client, admin, password)

        owner = create_owner()
        pet = create_pet(owner=owner, temperament='playful')

        url = reverse('pet-detail', args=[pet.id])
        resp = self.client.patch(url, {'temperament': 'calm'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        latest = Pet.history.filter(id=pet.id).order_by('-history_date').first()
        self.assertEqual(latest.history_type, '~')
        self.assertEqual(latest.history_user_id, admin.id)

    def test_history_user_null_for_orm_writes_outside_request(self):
        # No request context — direct ORM creates leave history_user NULL.
        pet = create_pet()
        latest = Pet.history.filter(id=pet.id).order_by('-history_date').first()
        self.assertIsNone(latest.history_user_id)
