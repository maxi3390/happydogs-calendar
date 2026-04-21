"""Tests for the Vet model, its REST API, and its relations to Owner and Pet."""
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status

from tests.factories import (
    create_and_auth_user,
    create_owner,
    create_pet,
    create_vet,
)
from pets.models import Owner, Pet, Vet


class VetModelTests(TestCase):
    """Direct model-level tests that don't need the HTTP surface."""

    def test_vet_inherits_address_fields(self):
        vet = create_vet(
            name='Happy Paws Clinic',
            street='123 Main St',
            city='Springfield',
            state='North',
            province='IL',
            country='USA',
        )
        vet.refresh_from_db()
        self.assertEqual(vet.street, '123 Main St')
        self.assertEqual(vet.city, 'Springfield')
        self.assertEqual(vet.state, 'North')
        self.assertEqual(vet.province, 'IL')
        self.assertEqual(vet.country, 'USA')

    def test_vet_address_fields_are_optional(self):
        vet = create_vet(name='Bare Clinic')
        self.assertEqual(vet.street, '')
        self.assertEqual(vet.city, '')
        self.assertEqual(vet.state, '')
        self.assertEqual(vet.province, '')
        self.assertEqual(vet.country, '')

    def test_str_returns_name(self):
        vet = create_vet(name='Dr Smith DVM')
        self.assertEqual(str(vet), 'Dr Smith DVM')


class EffectiveVetTests(TestCase):
    """Cover every branch of the Pet.effective_vet resolver."""

    def test_pet_with_override_returns_override(self):
        primary = create_vet(name='Primary Clinic')
        override = create_vet(name='Specialist Clinic')
        owner = create_owner(primary_vet=primary)
        pet = create_pet(owner=owner, vet_override=override)
        self.assertEqual(pet.effective_vet, override)

    def test_pet_without_override_falls_back_to_owner_primary(self):
        primary = create_vet(name='Primary Clinic')
        owner = create_owner(primary_vet=primary)
        pet = create_pet(owner=owner)
        self.assertEqual(pet.effective_vet, primary)

    def test_pet_without_override_and_owner_without_primary_returns_none(self):
        owner = create_owner()
        pet = create_pet(owner=owner)
        self.assertIsNone(pet.effective_vet)

    def test_pet_without_owner_returns_override_if_set_else_none(self):
        pet_no_owner_no_override = create_pet(owner=None)
        self.assertIsNone(pet_no_owner_no_override.effective_vet)

        override = create_vet(name='Standalone Clinic')
        pet_with_override = create_pet(owner=None, vet_override=override)
        self.assertEqual(pet_with_override.effective_vet, override)

    def test_deleting_override_falls_back_to_owner_primary(self):
        primary = create_vet(name='Primary Clinic')
        override = create_vet(name='Specialist Clinic')
        owner = create_owner(primary_vet=primary)
        pet = create_pet(owner=owner, vet_override=override)

        override.delete()
        pet.refresh_from_db()
        self.assertIsNone(pet.vet_override)
        self.assertEqual(pet.effective_vet, primary)


class VetAPITests(APITestCase):
    """REST surface for the Vet resource."""

    def setUp(self):
        self.user = create_and_auth_user(self.client)
        self.vet = create_vet(name='First Clinic', phone='555-0001')
        self.list_url = reverse('vet-list')
        self.detail_url = reverse('vet-detail', args=[self.vet.id])

    # ── List ───────────────────────────────────────────────────────────

    def test_list_vets(self):
        create_vet(name='Second Clinic')
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_list_requires_authentication(self):
        self.client.credentials()  # drop bearer token
        response = self.client.get(self.list_url)
        self.assertIn(response.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    # ── Retrieve ───────────────────────────────────────────────────────

    def test_retrieve_vet(self):
        response = self.client.get(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'First Clinic')
        self.assertEqual(response.data['phone'], '555-0001')

    # ── Create ─────────────────────────────────────────────────────────

    def test_create_vet_minimal(self):
        response = self.client.post(self.list_url, {'name': 'Minimal Clinic'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Minimal Clinic')
        self.assertEqual(response.data['phone'], '')

    def test_create_vet_with_full_address(self):
        payload = {
            'name': 'Full Clinic',
            'phone': '555-9999',
            'email': 'info@fullclinic.com',
            'street': '456 Oak Ave',
            'city': 'Pinewood',
            'state': 'South',
            'province': 'TX',
            'country': 'USA',
            'notes': 'Open 24/7',
        }
        response = self.client.post(self.list_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        for key, expected in payload.items():
            self.assertEqual(response.data[key], expected, f'field {key} did not round-trip')

    def test_create_requires_name(self):
        response = self.client.post(self.list_url, {'phone': '555-0000'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('name', response.data)

    # ── Update ─────────────────────────────────────────────────────────

    def test_patch_vet(self):
        response = self.client.patch(self.detail_url, {'phone': '555-1111'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.vet.refresh_from_db()
        self.assertEqual(self.vet.phone, '555-1111')

    # ── Delete ─────────────────────────────────────────────────────────

    def test_deleting_vet_nulls_owner_and_pet_references(self):
        # Arrange: owner + another-owner + pet all reference the same vet.
        primary_for_owner = create_owner(primary_vet=self.vet)
        emergency_for_owner = create_owner(emergency_vet=self.vet)
        pet = create_pet(owner=primary_for_owner, vet_override=self.vet)

        # Act: delete the vet via the API.
        response = self.client.delete(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Assert: the records still exist and the FKs were nulled.
        primary_for_owner.refresh_from_db()
        emergency_for_owner.refresh_from_db()
        pet.refresh_from_db()
        self.assertIsNone(primary_for_owner.primary_vet)
        self.assertIsNone(emergency_for_owner.emergency_vet)
        self.assertIsNone(pet.vet_override)


class OwnerVetRelationAPITests(APITestCase):
    """Owner create/patch round-trips the two new FK fields."""

    def setUp(self):
        self.user = create_and_auth_user(self.client)
        self.list_url = reverse('owner-list')
        self.vet_primary = create_vet(name='Primary Clinic')
        self.vet_emergency = create_vet(name='Emergency Clinic')

    def test_owner_create_with_primary_and_emergency_vets(self):
        payload = {
            'first_name': 'Alice',
            'last_name': 'Jones',
            'email': 'alice@example.com',
            'phone': '555-2000',
            'primary_vet': self.vet_primary.id,
            'emergency_vet': self.vet_emergency.id,
        }
        response = self.client.post(self.list_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        owner_id = response.data['id']

        detail = self.client.get(reverse('owner-detail', args=[owner_id]))
        self.assertEqual(detail.data['primary_vet'], self.vet_primary.id)
        self.assertEqual(detail.data['emergency_vet'], self.vet_emergency.id)

    def test_owner_patch_updates_vet_references(self):
        owner = create_owner(primary_vet=self.vet_primary)
        response = self.client.patch(
            reverse('owner-detail', args=[owner.id]),
            {'primary_vet': None, 'emergency_vet': self.vet_emergency.id},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        owner.refresh_from_db()
        self.assertIsNone(owner.primary_vet)
        self.assertEqual(owner.emergency_vet_id, self.vet_emergency.id)


class PetVetOverrideAPITests(APITestCase):
    """Pet create/patch round-trips vet_override."""

    def setUp(self):
        self.user = create_and_auth_user(self.client)
        self.list_url = reverse('pet-list')
        self.owner = create_owner()
        self.vet = create_vet(name='Exotic Specialist')

    def test_pet_create_with_vet_override(self):
        payload = {
            'name': 'Iggy',
            'species': 'other',
            'breed': 'Iguana',
            'age': 3,
            'temperament': 'calm',
            'dominance_level': 2,
            'size': 'small',
            'sex': 'male',
            'neutered': True,
            'owner': self.owner.id,
            'vet_override': self.vet.id,
        }
        response = self.client.post(self.list_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        pet_id = response.data['id']

        detail = self.client.get(reverse('pet-detail', args=[pet_id]))
        self.assertEqual(detail.data['vet_override'], self.vet.id)

    def test_pet_patch_clears_vet_override(self):
        pet = create_pet(owner=self.owner, vet_override=self.vet)
        response = self.client.patch(
            reverse('pet-detail', args=[pet.id]),
            {'vet_override': None},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        pet.refresh_from_db()
        self.assertIsNone(pet.vet_override)
