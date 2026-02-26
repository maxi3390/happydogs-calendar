from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from tests.factories import create_owner, create_pet
from pets.models import Owner


class OwnerAPITests(APITestCase):

    def setUp(self):
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
