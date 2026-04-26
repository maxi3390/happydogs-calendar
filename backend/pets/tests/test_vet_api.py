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


class VetNestedDetailsSerializerTests(APITestCase):
    """Pet / Owner serializers embed a compact VetListSerializer projection
    (`vet_override_details`, `primary_vet_details`, `emergency_vet_details`)
    so the pet- and owner-detail popups can show a real vet name and
    contact info without a second round-trip. The raw FK id fields stay
    writable — the nested blocks are read-only."""

    EXPECTED_KEYS = {'id', 'name', 'phone', 'email', 'city'}

    def setUp(self):
        self.user = create_and_auth_user(self.client)

    # ── Pet: vet_override_details ──────────────────────────────────────

    def test_pet_retrieve_exposes_vet_override_details(self):
        vet = create_vet(name='Specialist Clinic', phone='555-7777',
                         email='hi@specialist.example', city='Springfield')
        owner = create_owner()
        pet = create_pet(owner=owner, vet_override=vet)

        response = self.client.get(reverse('pet-detail', args=[pet.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['vet_override'], vet.id)
        details = response.data['vet_override_details']
        self.assertIsNotNone(details)
        self.assertEqual(set(details.keys()), self.EXPECTED_KEYS)
        self.assertEqual(details['id'], vet.id)
        self.assertEqual(details['name'], 'Specialist Clinic')
        self.assertEqual(details['phone'], '555-7777')
        self.assertEqual(details['email'], 'hi@specialist.example')
        self.assertEqual(details['city'], 'Springfield')

    def test_pet_without_vet_override_returns_null_details(self):
        owner = create_owner()
        pet = create_pet(owner=owner)

        response = self.client.get(reverse('pet-detail', args=[pet.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['vet_override'])
        self.assertIsNone(response.data['vet_override_details'])

    def test_pet_list_also_carries_vet_override_details(self):
        """The /api/pets/ list endpoint uses the same PetSerializer, so the
        nested projection surfaces there too without an extra query."""
        vet = create_vet(name='Specialist Clinic')
        owner = create_owner()
        create_pet(owner=owner, vet_override=vet)

        response = self.client.get(reverse('pet-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        details = response.data[0]['vet_override_details']
        self.assertIsNotNone(details)
        self.assertEqual(details['name'], 'Specialist Clinic')

    # ── Owner: primary_vet_details / emergency_vet_details ─────────────

    def test_owner_retrieve_exposes_primary_and_emergency_vet_details(self):
        primary = create_vet(name='Primary Clinic', city='Springfield')
        emergency = create_vet(name='Nightline Vet', city='Shelbyville')
        owner = create_owner(primary_vet=primary, emergency_vet=emergency)

        response = self.client.get(reverse('owner-detail', args=[owner.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['primary_vet'], primary.id)
        self.assertEqual(response.data['emergency_vet'], emergency.id)

        p = response.data['primary_vet_details']
        e = response.data['emergency_vet_details']
        self.assertIsNotNone(p)
        self.assertIsNotNone(e)
        self.assertEqual(set(p.keys()), self.EXPECTED_KEYS)
        self.assertEqual(set(e.keys()), self.EXPECTED_KEYS)
        self.assertEqual(p['name'], 'Primary Clinic')
        self.assertEqual(p['city'], 'Springfield')
        self.assertEqual(e['name'], 'Nightline Vet')
        self.assertEqual(e['city'], 'Shelbyville')

    def test_owner_without_vets_returns_null_details(self):
        owner = create_owner()

        response = self.client.get(reverse('owner-detail', args=[owner.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['primary_vet'])
        self.assertIsNone(response.data['emergency_vet'])
        self.assertIsNone(response.data['primary_vet_details'])
        self.assertIsNone(response.data['emergency_vet_details'])

    def test_owner_list_also_carries_vet_details(self):
        """The /api/owners/ list endpoint (OwnerSerializer) exposes the
        same projection so the primary-page view that is not yet hitting
        detail has the vet name available for future surfaces too."""
        primary = create_vet(name='Primary Clinic')
        emergency = create_vet(name='Nightline Vet')
        create_owner(primary_vet=primary, emergency_vet=emergency)

        response = self.client.get(reverse('owner-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        row = response.data[0]
        self.assertIsNotNone(row['primary_vet_details'])
        self.assertIsNotNone(row['emergency_vet_details'])
        self.assertEqual(row['primary_vet_details']['name'], 'Primary Clinic')
        self.assertEqual(row['emergency_vet_details']['name'], 'Nightline Vet')


class PetEmergencyAccessSerializerTests(APITestCase):
    """`effective_vet_details` and `emergency_vet_details` on PetSerializer
    power the pet list accordion's emergency-access block: one vet to
    call right now, one vet for after-hours / emergencies. The fields
    resolve via the existing `Pet.effective_vet` property and via
    `pet.owner.emergency_vet` respectively, so the list endpoint covers
    both in a single round-trip."""

    EXPECTED_KEYS = {'id', 'name', 'phone', 'email', 'city'}

    def setUp(self):
        self.user = create_and_auth_user(self.client)

    # ── effective_vet_details ──────────────────────────────────────────

    def test_effective_vet_uses_override_when_set(self):
        override = create_vet(name='Specialist Clinic')
        primary = create_vet(name='Family Clinic')
        owner = create_owner(primary_vet=primary)
        pet = create_pet(owner=owner, vet_override=override)

        response = self.client.get(reverse('pet-detail', args=[pet.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        details = response.data['effective_vet_details']
        self.assertIsNotNone(details)
        self.assertEqual(set(details.keys()), self.EXPECTED_KEYS)
        self.assertEqual(details['name'], 'Specialist Clinic')
        # vet_override_details and effective_vet_details both point at the
        # override here — that's fine and intentional.
        self.assertEqual(response.data['vet_override_details']['name'], 'Specialist Clinic')

    def test_effective_vet_falls_back_to_owner_primary(self):
        primary = create_vet(name='Family Clinic')
        owner = create_owner(primary_vet=primary)
        pet = create_pet(owner=owner)

        response = self.client.get(reverse('pet-detail', args=[pet.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['vet_override_details'])
        effective = response.data['effective_vet_details']
        self.assertIsNotNone(effective)
        self.assertEqual(effective['name'], 'Family Clinic')

    def test_effective_vet_is_null_when_neither_resolvable(self):
        # No override, owner has no primary vet.
        owner = create_owner()
        pet = create_pet(owner=owner)

        response = self.client.get(reverse('pet-detail', args=[pet.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['effective_vet_details'])

    def test_effective_vet_is_null_when_pet_has_no_owner(self):
        pet = create_pet(owner=None)

        response = self.client.get(reverse('pet-detail', args=[pet.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['effective_vet_details'])

    # ── emergency_vet_details ──────────────────────────────────────────

    def test_emergency_vet_comes_from_owner(self):
        emergency = create_vet(name='Nightline Vet', phone='555-9911')
        owner = create_owner(emergency_vet=emergency)
        pet = create_pet(owner=owner)

        response = self.client.get(reverse('pet-detail', args=[pet.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        details = response.data['emergency_vet_details']
        self.assertIsNotNone(details)
        self.assertEqual(set(details.keys()), self.EXPECTED_KEYS)
        self.assertEqual(details['name'], 'Nightline Vet')
        self.assertEqual(details['phone'], '555-9911')

    def test_emergency_vet_is_null_when_pet_has_no_owner(self):
        pet = create_pet(owner=None)

        response = self.client.get(reverse('pet-detail', args=[pet.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['emergency_vet_details'])

    def test_emergency_vet_is_null_when_owner_has_no_emergency_vet(self):
        owner = create_owner()  # no emergency_vet
        pet = create_pet(owner=owner)

        response = self.client.get(reverse('pet-detail', args=[pet.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['emergency_vet_details'])

    # ── list endpoint also carries both ────────────────────────────────

    def test_pet_list_carries_effective_and_emergency_vet_details(self):
        """The /api/pets/ list is what the PetList accordion paints
        against. Both projections MUST be available there."""
        override = create_vet(name='Specialist Clinic')
        primary = create_vet(name='Family Clinic')
        emergency = create_vet(name='Nightline Vet')
        owner = create_owner(primary_vet=primary, emergency_vet=emergency)
        create_pet(owner=owner, vet_override=override)

        response = self.client.get(reverse('pet-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        row = response.data[0]
        self.assertEqual(row['effective_vet_details']['name'], 'Specialist Clinic')
        self.assertEqual(row['emergency_vet_details']['name'], 'Nightline Vet')
