from io import BytesIO
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.urls import reverse
from PIL import Image as PILImage
from rest_framework.test import APITestCase
from rest_framework import status
from tests.factories import create_owner, create_pet, create_and_auth_user
from pets.models import Owner


def _make_test_image(name='test.png', fmt='PNG'):
    """Create a small in-memory image for testing."""
    buf = BytesIO()
    PILImage.new('RGB', (50, 50), color='blue').save(buf, format=fmt)
    buf.seek(0)
    return SimpleUploadedFile(name, buf.read(), content_type=f'image/{fmt.lower()}')


class OwnerAPITests(APITestCase):

    def setUp(self):
        self.user = create_and_auth_user(self.client)
        self.owner = create_owner(first_name='John', last_name='Doe',
                                  email='john@example.com', phone='555-1234')
        self.list_url = reverse('owner-list')
        self.detail_url = reverse('owner-detail', args=[self.owner.id])

    # ── List ───────────────────────────────────────────────────────────

    def test_list_owners(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_list_includes_pet_count(self):
        create_pet(owner=self.owner)
        create_pet(owner=self.owner)
        response = self.client.get(self.list_url)
        self.assertEqual(response.data[0]['pet_count'], 2)

    # ── Create ─────────────────────────────────────────────────────────

    def test_create_owner(self):
        data = {
            'first_name': 'Jane',
            'last_name': 'Smith',
            'email': 'jane@example.com',
            'phone': '555-5678',
        }
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Owner.objects.count(), 2)

    def test_create_owner_duplicate_email(self):
        data = {
            'first_name': 'Dup',
            'last_name': 'Owner',
            'email': 'john@example.com',
            'phone': '555-0000',
        }
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_owner_missing_required_fields(self):
        response = self.client.post(self.list_url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ── Retrieve ───────────────────────────────────────────────────────

    def test_retrieve_owner(self):
        response = self.client.get(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['first_name'], 'John')

    def test_retrieve_owner_includes_pets(self):
        create_pet(owner=self.owner, name='Buddy')
        response = self.client.get(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['pets']), 1)
        self.assertEqual(response.data['pets'][0]['name'], 'Buddy')

    def test_retrieve_nonexistent_owner(self):
        url = reverse('owner-detail', args=[9999])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # ── Update ─────────────────────────────────────────────────────────

    def test_update_owner(self):
        data = {
            'first_name': 'Johnny',
            'last_name': 'Doe',
            'email': 'john@example.com',
            'phone': '555-1234',
        }
        response = self.client.put(self.detail_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.owner.refresh_from_db()
        self.assertEqual(self.owner.first_name, 'Johnny')

    def test_partial_update_owner(self):
        response = self.client.patch(self.detail_url,
                                     {'last_name': 'Updated'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.owner.refresh_from_db()
        self.assertEqual(self.owner.last_name, 'Updated')

    # ── Delete ─────────────────────────────────────────────────────────

    def test_delete_owner(self):
        response = self.client.delete(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Owner.objects.count(), 0)

    # ── Dropdown action ────────────────────────────────────────────────

    def test_dropdown(self):
        url = reverse('owner-dropdown')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertIn('full_name', response.data[0])

    # ── Create with profile picture (multipart) ────────────────────────

    def test_create_owner_with_profile_picture_multipart(self):
        image = _make_test_image()
        data = {
            'first_name': 'Photo',
            'last_name': 'Owner',
            'email': 'photo@example.com',
            'phone': '555-9999',
            'profile_picture': image,
        }
        response = self.client.post(self.list_url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNotNone(response.data['profile_picture_url'])
        owner = Owner.objects.get(pk=response.data['id'])
        self.assertTrue(owner.profile_picture)

    def test_create_owner_json_still_works(self):
        """Backward compatibility: JSON create without picture still works."""
        data = {
            'first_name': 'Json',
            'last_name': 'Owner',
            'email': 'json@example.com',
            'phone': '555-8888',
        }
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(response.data['profile_picture_url'])

    def test_owner_deletion_cascades_to_pets(self):
        """Deleting an owner should delete all their pets (CASCADE)."""
        create_pet(owner=self.owner, name='Fluffy')
        create_pet(owner=self.owner, name='Rex')
        from pets.models import Pet
        self.assertEqual(Pet.objects.filter(owner=self.owner).count(), 2)
        response = self.client.delete(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Pet.objects.filter(owner_id=self.owner.id).count(), 0)

    # ── Structured address (ciudad / localidad / provincia / país) ────

    def test_create_owner_with_structured_address(self):
        data = {
            'first_name': 'Ana',
            'last_name': 'Garcia',
            'email': 'ana.garcia@example.com',
            'phone': '+54 11 1234 5678',
            'street': 'Av. Cabildo 1234',
            'city': 'Ciudad Autonoma de Buenos Aires',
            'state': 'Belgrano',
            'province': 'Buenos Aires',
            'country': 'Argentina',
        }
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        for field in ['street', 'city', 'state', 'province', 'country']:
            self.assertEqual(response.data[field], data[field])
        owner = Owner.objects.get(pk=response.data['id'])
        self.assertEqual(owner.street, 'Av. Cabildo 1234')
        self.assertEqual(owner.city, 'Ciudad Autonoma de Buenos Aires')
        self.assertEqual(owner.state, 'Belgrano')
        self.assertEqual(owner.province, 'Buenos Aires')
        self.assertEqual(owner.country, 'Argentina')

    def test_create_owner_with_empty_address_fields(self):
        """All structured address fields are optional."""
        data = {
            'first_name': 'NoAddress',
            'last_name': 'Owner',
            'email': 'noaddress@example.com',
            'phone': '+54 11 0000 0000',
        }
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        for field in ['street', 'city', 'state', 'province', 'country']:
            self.assertEqual(response.data[field], '')

    def test_patch_single_address_field(self):
        """PATCH a single address component without touching the others."""
        self.owner.street = 'Calle 1'
        self.owner.city = 'Cordoba'
        self.owner.province = 'Cordoba'
        self.owner.save()
        response = self.client.patch(self.detail_url, {'state': 'Nueva Cordoba'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.owner.refresh_from_db()
        self.assertEqual(self.owner.state, 'Nueva Cordoba')
        self.assertEqual(self.owner.street, 'Calle 1')
        self.assertEqual(self.owner.city, 'Cordoba')
        self.assertEqual(self.owner.province, 'Cordoba')

    def test_owner_with_pets_payload_includes_address_fields(self):
        self.owner.street = 'Street X'
        self.owner.city = 'City Y'
        self.owner.state = 'State Z'
        self.owner.province = 'Province P'
        self.owner.country = 'Country C'
        self.owner.save()
        response = self.client.get(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for field in ['street', 'city', 'state', 'province', 'country']:
            self.assertIn(field, response.data)
        self.assertEqual(response.data['street'], 'Street X')
        self.assertEqual(response.data['state'], 'State Z')
        # Legacy single-address field must not be present
        self.assertNotIn('address', response.data)
