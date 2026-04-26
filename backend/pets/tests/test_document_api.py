from io import BytesIO
from PIL import Image as PILImage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from tests.factories import create_owner, create_pet, create_and_auth_user
from pets.models import Document


def _make_test_image(name='test.png', fmt='PNG'):
    buf = BytesIO()
    PILImage.new('RGB', (50, 50), color='red').save(buf, format=fmt)
    buf.seek(0)
    return SimpleUploadedFile(name, buf.read(), content_type=f'image/{fmt.lower()}')


class DocumentAPITests(APITestCase):

    def setUp(self):
        self.user = create_and_auth_user(self.client)
        self.owner = create_owner()
        self.pet = create_pet(owner=self.owner)
        self.list_url = reverse('document-list')

    def test_upload_document_linked_to_pet(self):
        f = _make_test_image('petdoc.png')
        data = {'pet': self.pet.id, 'file': f, 'description': 'Xray'}
        response = self.client.post(self.list_url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['original_filename'], 'petdoc.png')
        self.assertEqual(response.data['pet'], self.pet.id)

    def test_upload_document_linked_to_owner(self):
        f = _make_test_image('ownerdoc.png')
        data = {'owner': self.owner.id, 'file': f}
        response = self.client.post(self.list_url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['owner'], self.owner.id)

    def test_reject_document_linked_to_both_pet_and_owner(self):
        f = _make_test_image()
        data = {'pet': self.pet.id, 'owner': self.owner.id, 'file': f}
        response = self.client.post(self.list_url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reject_document_linked_to_neither(self):
        f = _make_test_image()
        response = self.client.post(self.list_url, {'file': f}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reject_oversized_document(self):
        big = SimpleUploadedFile('big.png', b'\x00' * (6 * 1024 * 1024), content_type='image/png')
        data = {'pet': self.pet.id, 'file': big}
        response = self.client.post(self.list_url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_documents_filtered_by_pet(self):
        other_pet = create_pet(owner=self.owner, name='Other')
        # Upload for self.pet
        self.client.post(self.list_url, {'pet': self.pet.id, 'file': _make_test_image('a.png')}, format='multipart')
        # Upload for other_pet
        self.client.post(self.list_url, {'pet': other_pet.id, 'file': _make_test_image('b.png')}, format='multipart')
        response = self.client.get(self.list_url, {'pet_id': self.pet.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['pet'], self.pet.id)

    def test_list_documents_filtered_by_owner(self):
        other_owner = create_owner()
        self.client.post(
            self.list_url,
            {'owner': self.owner.id, 'file': _make_test_image('c.png')},
            format='multipart',
        )
        self.client.post(
            self.list_url,
            {'owner': other_owner.id, 'file': _make_test_image('d.png')},
            format='multipart',
        )
        response = self.client.get(self.list_url, {'owner_id': self.owner.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_delete_document(self):
        upload = self.client.post(self.list_url, {'pet': self.pet.id, 'file': _make_test_image()}, format='multipart')
        doc_id = upload.data['id']
        response = self.client.delete(reverse('document-detail', args=[doc_id]))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Document.objects.filter(id=doc_id).count(), 0)
