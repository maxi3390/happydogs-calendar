"""History endpoint tests — admin-only reads."""
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status

from pets.models import MedicalNote
from tests.factories import (
    auth_client, create_admin, create_owner, create_pet, create_user,
    create_vaccination,
)


class HistoryEndpointPermissionTests(APITestCase):
    def setUp(self):
        self.admin = create_admin()
        self.admin_password = 'AdminPass123!'
        self.admin.set_password(self.admin_password)
        self.admin.save()

        self.user = create_user()
        self.user_password = 'UserPass123!'
        self.user.set_password(self.user_password)
        self.user.save()

        self.pet = create_pet()
        self.url = reverse('pet-history', args=[self.pet.id])

    def test_unauthenticated_returns_401(self):
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_non_admin_returns_403(self):
        auth_client(self.client, self.user, self.user_password)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_returns_200(self):
        auth_client(self.client, self.admin, self.admin_password)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)


class HistoryEndpointShapeTests(APITestCase):
    """Response shape: ordered rows with snapshot + history_user."""

    def setUp(self):
        self.admin = create_admin()
        self.password = 'AdminPass123!'
        self.admin.set_password(self.password)
        self.admin.save()
        auth_client(self.client, self.admin, self.password)

    def test_pet_history_lists_rows_most_recent_first(self):
        pet = create_pet(temperament='playful')
        # Drive the changes through the PATCH endpoint so the
        # middleware attributes the rows to the admin.
        url = reverse('pet-detail', args=[pet.id])
        self.client.patch(url, {'temperament': 'calm'}, format='json')
        self.client.patch(url, {'temperament': 'friendly'}, format='json')

        resp = self.client.get(reverse('pet-history', args=[pet.id]))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        rows = resp.data
        # 1 create (no user) + 2 updates (admin user) = 3.
        self.assertEqual(len(rows), 3)

        # Newest-first ordering.
        types_in_order = [r['history_type'] for r in rows]
        self.assertEqual(types_in_order, ['~', '~', '+'])

        # Most-recent row carries the post-change snapshot.
        self.assertEqual(rows[0]['snapshot']['temperament'], 'friendly')
        # history_user populated for the PATCH-driven rows; null for
        # the factory-driven create.
        self.assertEqual(rows[0]['history_user']['id'], self.admin.id)
        self.assertIsNone(rows[2]['history_user'])

    def test_owner_history_endpoint(self):
        owner = create_owner()
        resp = self.client.get(reverse('owner-history', args=[owner.id]))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]['history_type'], '+')

    def test_medical_note_history_endpoint(self):
        pet = create_pet()
        note = MedicalNote.objects.create(pet=pet, title='Diet', description='Grain-free')
        url = reverse('medical-note-history', args=[pet.id, note.id])
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data[0]['snapshot']['title'], 'Diet')

    def test_medical_note_history_404_when_pet_mismatches(self):
        pet1 = create_pet()
        pet2 = create_pet()
        note = MedicalNote.objects.create(pet=pet1, title='Diet')
        bad_url = reverse('medical-note-history', args=[pet2.id, note.id])
        resp = self.client.get(bad_url)
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_vaccination_history_endpoint(self):
        pet = create_pet()
        v = create_vaccination(pet=pet, vax_type='rabies')
        url = reverse('vaccination-history', args=[pet.id, v.id])
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data[0]['snapshot']['vax_type'], 'rabies')
