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
        self.assertEqual(response.data['count'], 1)

    def test_filter_medical_notes_by_pet_id(self):
        other_pet = create_pet(name='Rocky')
        MedicalNote.objects.create(pet=self.pet, title='Ear care', description='Clean weekly')
        MedicalNote.objects.create(pet=other_pet, title='Medication', description='Daily dose')

        response = self.client.get(f"{self.list_url}?pet_id={self.pet.id}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['pet'], self.pet.id)

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

    def test_create_medical_note_without_title_rejected(self):
        data = {'pet': self.pet.id, 'description': 'no title'}
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_medical_note_without_pet_rejected(self):
        data = {'title': 'Test', 'description': 'no pet'}
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_medical_notes_count_updates_on_create_and_delete(self):
        """The medical_notes_count on pet detail updates when notes are added/removed."""
        pet_url = reverse('pet-detail', args=[self.pet.id])
        # Initial count
        initial = self.client.get(pet_url).data['medical_notes_count']
        # Create a note
        note_resp = self.client.post(
            self.list_url,
            {'pet': self.pet.id, 'title': 'CountTest', 'description': ''},
            format='json',
        )
        self.assertEqual(note_resp.status_code, status.HTTP_201_CREATED)
        after_create = self.client.get(pet_url).data['medical_notes_count']
        self.assertEqual(after_create, initial + 1)
        # Delete the note
        note_id = note_resp.data['id']
        del_resp = self.client.delete(reverse('medicalnote-detail', args=[note_id]))
        self.assertEqual(del_resp.status_code, status.HTTP_204_NO_CONTENT)
        after_delete = self.client.get(pet_url).data['medical_notes_count']
        self.assertEqual(after_delete, initial)
