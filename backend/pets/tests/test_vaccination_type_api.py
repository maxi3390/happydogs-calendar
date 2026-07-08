from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from tests.factories import create_vaccination_type, create_and_auth_user
from pets.models import VaccinationType


class VaccinationTypeAPITests(APITestCase):

    def setUp(self):
        self.user = create_and_auth_user(self.client)
        self.initial_count = VaccinationType.objects.count()
        self.vt = create_vaccination_type(name='test_custom_vax', label='Custom Vax')
        self.list_url = reverse('vaccinationtype-list')
        self.detail_url = reverse('vaccinationtype-detail', args=[self.vt.id])

    def test_list(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], self.initial_count + 1)

    def test_create(self):
        data = {'name': 'test_new_vax', 'label': 'New Vax', 'enabled': True, 'order': 99}
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(VaccinationType.objects.count(), self.initial_count + 2)

    def test_create_duplicate_name(self):
        data = {'name': 'test_custom_vax', 'label': 'Dup', 'enabled': True, 'order': 99}
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_retrieve(self):
        response = self.client.get(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['label'], 'Custom Vax')

    def test_update(self):
        data = {'name': 'test_custom_vax', 'label': 'Updated Vax', 'enabled': False, 'order': 1}
        response = self.client.put(self.detail_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.vt.refresh_from_db()
        self.assertFalse(self.vt.enabled)

    def test_partial_update(self):
        response = self.client.patch(self.detail_url, {'enabled': False}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.vt.refresh_from_db()
        self.assertFalse(self.vt.enabled)

    def test_delete(self):
        response = self.client.delete(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(VaccinationType.objects.count(), self.initial_count)
