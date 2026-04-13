from datetime import date
from io import BytesIO
from PIL import Image as PILImage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from tests.factories import create_owner, create_pet, create_and_auth_user
from pets.models import Pet


def _make_test_image(name='test.png', size=(100, 100), fmt='PNG'):
    """Create a small in-memory image for testing."""
    buf = BytesIO()
    PILImage.new('RGB', size, color='red').save(buf, format=fmt)
    buf.seek(0)
    return SimpleUploadedFile(name, buf.read(), content_type=f'image/{fmt.lower()}')


class PetAPITests(APITestCase):

    def setUp(self):
        self.user = create_and_auth_user(self.client)
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

    # ── Create with profile picture (multipart) ────────────────────────

    def test_create_pet_with_profile_picture_multipart(self):
        image = _make_test_image()
        data = {
            'name': 'PhotoPet',
            'species': 'dog',
            'breed': 'Poodle',
            'age': 2,
            'temperament': 'calm',
            'dominance_level': 3,
            'size': 'small',
            'owner': self.owner.id,
            'profile_picture': image,
        }
        response = self.client.post(self.list_url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNotNone(response.data['profile_picture_url'])
        pet = Pet.objects.get(pk=response.data['id'])
        self.assertTrue(pet.profile_picture)

    def test_create_pet_with_picture_and_vaccinations_multipart(self):
        import json as _json
        image = _make_test_image('vax_pet.png')
        data = {
            'name': 'VaxPhotoPet',
            'species': 'cat',
            'age': 1,
            'temperament': 'friendly',
            'dominance_level': 4,
            'size': 'medium',
            'owner': self.owner.id,
            'profile_picture': image,
            'vaccinations': _json.dumps([
                {'vax_type': 'rabies', 'date': str(date.today())},
            ]),
        }
        response = self.client.post(self.list_url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNotNone(response.data['profile_picture_url'])
        self.assertEqual(len(response.data['vaccinations']), 1)

    def test_create_pet_json_still_works(self):
        """Backward compatibility: JSON create without picture still works."""
        data = {
            'name': 'JsonPet',
            'species': 'bird',
            'age': 1,
            'temperament': 'calm',
            'dominance_level': 2,
            'size': 'small',
        }
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(response.data['profile_picture_url'])
