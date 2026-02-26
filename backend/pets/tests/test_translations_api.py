from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status


class TranslationsAPITests(APITestCase):

    def test_get_english_translations(self):
        url = reverse('get_translations', kwargs={'language': 'en'})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, dict)

    def test_get_spanish_translations(self):
        url = reverse('get_translations', kwargs={'language': 'es'})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, dict)

    def test_unsupported_language(self):
        url = reverse('get_translations', kwargs={'language': 'fr'})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_default_translations(self):
        url = reverse('get_translations_default')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class AvailableLanguagesAPITests(APITestCase):

    def test_list_languages(self):
        url = reverse('get_available_languages')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        codes = [lang['code'] for lang in response.data]
        self.assertIn('en', codes)
        self.assertIn('es', codes)
