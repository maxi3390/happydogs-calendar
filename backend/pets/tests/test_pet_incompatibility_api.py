from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from tests.factories import create_pet, create_and_auth_user
from pets.models import Pet, PetIncompatibility


class PetIncompatibilityAPITests(APITestCase):
    """CRUD + invariants for the persisted custom-incompatibility catalog."""

    def setUp(self):
        self.user = create_and_auth_user(self.client)
        self.pet_a = create_pet(name='Luna')
        self.pet_b = create_pet(name='Milo')
        self.pet_c = create_pet(name='Cleo')
        self.list_url = reverse('petincompatibility-list')

    # ── Create ──────────────────────────────────────────────────────────

    def test_create_rule(self):
        response = self.client.post(self.list_url, {
            'pet1': self.pet_a.id,
            'pet2': self.pet_b.id,
            'reason': 'Vet advised separation',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(PetIncompatibility.objects.count(), 1)
        rule = PetIncompatibility.objects.get()
        # Smaller id stored as pet1, larger as pet2 — order-independent.
        self.assertEqual(rule.pet1_id, min(self.pet_a.id, self.pet_b.id))
        self.assertEqual(rule.pet2_id, max(self.pet_a.id, self.pet_b.id))
        # Convenience name fields are present in the response.
        self.assertEqual(response.data['pet1_name'], rule.pet1.name)
        self.assertEqual(response.data['pet2_name'], rule.pet2.name)

    def test_create_normalises_reverse_order(self):
        """POSTing pets in either order produces the same canonical row."""
        response = self.client.post(self.list_url, {
            # Intentionally reversed: larger first.
            'pet1': max(self.pet_a.id, self.pet_b.id),
            'pet2': min(self.pet_a.id, self.pet_b.id),
            'reason': 'reversed-order create',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        rule = PetIncompatibility.objects.get()
        self.assertEqual(rule.pet1_id, min(self.pet_a.id, self.pet_b.id))
        self.assertEqual(rule.pet2_id, max(self.pet_a.id, self.pet_b.id))

    def test_create_rejects_self_pair(self):
        response = self.client.post(self.list_url, {
            'pet1': self.pet_a.id,
            'pet2': self.pet_a.id,
            'reason': 'whatever',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cannot be incompatible with itself', str(response.data).lower())

    def test_create_rejects_duplicate_pair_either_order(self):
        """A second rule for the same unordered pair MUST fail."""
        PetIncompatibility.objects.create(
            pet1=Pet.objects.get(pk=min(self.pet_a.id, self.pet_b.id)),
            pet2=Pet.objects.get(pk=max(self.pet_a.id, self.pet_b.id)),
            reason='first',
        )
        response = self.client.post(self.list_url, {
            # Reverse order — should still collide post-normalisation.
            'pet1': self.pet_b.id,
            'pet2': self.pet_a.id,
            'reason': 'second',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ── List / Retrieve ────────────────────────────────────────────────

    def test_list_rules(self):
        PetIncompatibility.objects.create(
            pet1=Pet.objects.get(pk=min(self.pet_a.id, self.pet_b.id)),
            pet2=Pet.objects.get(pk=max(self.pet_a.id, self.pet_b.id)),
            reason='r1',
        )
        PetIncompatibility.objects.create(
            pet1=Pet.objects.get(pk=min(self.pet_a.id, self.pet_c.id)),
            pet2=Pet.objects.get(pk=max(self.pet_a.id, self.pet_c.id)),
            reason='r2',
        )
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)

    # ── Update / Delete ────────────────────────────────────────────────

    def test_partial_update_reason(self):
        rule = PetIncompatibility.objects.create(
            pet1=Pet.objects.get(pk=min(self.pet_a.id, self.pet_b.id)),
            pet2=Pet.objects.get(pk=max(self.pet_a.id, self.pet_b.id)),
            reason='old reason',
        )
        url = reverse('petincompatibility-detail', args=[rule.id])
        response = self.client.patch(url, {'reason': 'new reason'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rule.refresh_from_db()
        self.assertEqual(rule.reason, 'new reason')

    def test_delete_rule(self):
        rule = PetIncompatibility.objects.create(
            pet1=Pet.objects.get(pk=min(self.pet_a.id, self.pet_b.id)),
            pet2=Pet.objects.get(pk=max(self.pet_a.id, self.pet_b.id)),
            reason='to delete',
        )
        url = reverse('petincompatibility-detail', args=[rule.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(PetIncompatibility.objects.count(), 0)

    # ── Cascade ────────────────────────────────────────────────────────

    def test_cascade_when_pet_deleted(self):
        PetIncompatibility.objects.create(
            pet1=Pet.objects.get(pk=min(self.pet_a.id, self.pet_b.id)),
            pet2=Pet.objects.get(pk=max(self.pet_a.id, self.pet_b.id)),
            reason='cascade-test',
        )
        self.assertEqual(PetIncompatibility.objects.count(), 1)
        self.pet_a.delete()
        self.assertEqual(PetIncompatibility.objects.count(), 0)

    # ── Auth ───────────────────────────────────────────────────────────

    def test_unauthenticated_rejected(self):
        self.client.credentials()
        response = self.client.get(self.list_url)
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )
