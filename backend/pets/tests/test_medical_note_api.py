from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from tests.factories import create_and_auth_user, create_pet
from pets.models import MedicalNote


class MedicalNoteAPITests(APITestCase):
    def setUp(self):
        self.user = create_and_auth_user(self.client)
        self.pet = create_pet(name='Luna')
        self.list_url = reverse('medicalnote-list')

    def test_list_medical_notes(self):
        MedicalNote.objects.create(pet=self.pet, title='Allergy', description='Needs hypoallergenic food')

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_filter_medical_notes_by_pet_id(self):
        other_pet = create_pet(name='Rocky')
        MedicalNote.objects.create(pet=self.pet, title='Ear care', description='Clean weekly')
        MedicalNote.objects.create(pet=other_pet, title='Medication', description='Daily dose')

        response = self.client.get(f"{self.list_url}?pet_id={self.pet.id}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['pet'], self.pet.id)

    def test_create_medical_note(self):
        payload = {
            'pet': self.pet.id,
            'title': 'Medication',
            'description': 'Give one tablet after meals',
        }

        response = self.client.post(self.list_url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(MedicalNote.objects.count(), 1)
        self.assertEqual(response.data['title'], payload['title'])

    def test_update_medical_note(self):
        note = MedicalNote.objects.create(pet=self.pet, title='Old title', description='old')
        detail_url = reverse('medicalnote-detail', args=[note.id])

        response = self.client.patch(detail_url, {'title': 'Updated title'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        note.refresh_from_db()
        self.assertEqual(note.title, 'Updated title')

    def test_delete_medical_note(self):
        note = MedicalNote.objects.create(pet=self.pet, title='To delete', description='remove')
        detail_url = reverse('medicalnote-detail', args=[note.id])

        response = self.client.delete(detail_url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(MedicalNote.objects.filter(id=note.id).exists())
