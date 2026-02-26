from datetime import date
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from tests.factories import create_owner, create_pet
from pets.models import Pet


class PetAPITests(APITestCase):

    def setUp(self):
        self.owner = create_owner()
        self.pet = create_pet(
            owner=self.owner, name='Buddy', species='dog',
            breed='Golden Retriever', age=3, temperament='friendly',
            dominance_level=5, size='large',
        )
        self.list_url = reverse('pet-list')
        self.detail_url = reverse('pet-detail', args=[self.pet.id])

    # ── List / Retrieve ────────────────────────────────────────────────

    def test_list_pets(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_retrieve_pet(self):
        response = self.client.get(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Buddy')

    def test_retrieve_includes_owner_details(self):
        response = self.client.get(self.detail_url)
        self.assertIn('owner_details', response.data)

    # ── Create ─────────────────────────────────────────────────────────

    def test_create_pet(self):
        data = {
            'name': 'Whiskers',
            'species': 'cat',
            'breed': 'Persian',
            'age': 2,
            'temperament': 'calm',
            'dominance_level': 3,
            'size': 'medium',
            'owner': self.owner.id,
        }
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Pet.objects.count(), 2)

    def test_create_pet_with_vaccinations(self):
        data = {
            'name': 'Rex',
            'species': 'dog',
            'breed': 'Shepherd',
            'age': 4,
            'temperament': 'friendly',
            'dominance_level': 6,
            'size': 'large',
            'owner': self.owner.id,
            'vaccinations': [
                {'vax_type': 'rabies', 'date': str(date.today())},
            ],
        }
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data['vaccinations']), 1)

    def test_create_pet_invalid_dominance_too_high(self):
        data = {
            'name': 'Bad',
            'species': 'dog',
            'age': 1,
            'temperament': 'calm',
            'dominance_level': 15,
            'size': 'small',
        }
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_pet_invalid_dominance_too_low(self):
        data = {
            'name': 'Bad',
            'species': 'dog',
            'age': 1,
            'temperament': 'calm',
            'dominance_level': 0,
            'size': 'small',
        }
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_pet_without_owner(self):
        data = {
            'name': 'Stray',
            'species': 'cat',
            'age': 1,
            'temperament': 'calm',
            'dominance_level': 3,
            'size': 'small',
        }
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    # ── Update ─────────────────────────────────────────────────────────

    def test_update_pet(self):
        data = {
            'name': 'Buddy Jr',
            'species': 'dog',
            'breed': 'Golden Retriever',
            'age': 4,
            'temperament': 'friendly',
            'dominance_level': 5,
            'size': 'large',
            'owner': self.owner.id,
        }
        response = self.client.put(self.detail_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.pet.refresh_from_db()
        self.assertEqual(self.pet.name, 'Buddy Jr')

    def test_partial_update_pet(self):
        response = self.client.patch(self.detail_url,
                                     {'temperament': 'calm'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.pet.refresh_from_db()
        self.assertEqual(self.pet.temperament, 'calm')

    # ── Delete ─────────────────────────────────────────────────────────

    def test_delete_pet(self):
        response = self.client.delete(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Pet.objects.count(), 0)

    # ── Compatibility endpoint ─────────────────────────────────────────

    def test_compatibility_endpoint(self):
        create_pet(temperament='aggressive', dominance_level=8, size='large')
        url = reverse('pet-compatibility', args=[self.pet.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertFalse(response.data[0]['is_compatible'])

    def test_compatibility_all_compatible(self):
        create_pet(temperament='calm', dominance_level=3, size='medium')
        url = reverse('pet-compatibility', args=[self.pet.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data[0]['is_compatible'])
