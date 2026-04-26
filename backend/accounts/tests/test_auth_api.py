from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from tests.factories import create_user, auth_client

User = get_user_model()


class RegisterTests(APITestCase):

    def setUp(self):
        self.url = reverse('register')

    def _register_data(self, **overrides):
        data = {
            'email': 'new@example.com',
            'password': 'StrongPass123!',
            'password_confirm': 'StrongPass123!',
            'first_name': 'New',
            'last_name': 'User',
        }
        data.update(overrides)
        return data

    def test_register_success(self):
        response = self.client.post(self.url, self._register_data(), format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('tokens', response.data)
        self.assertIn('access', response.data['tokens'])
        self.assertIn('refresh', response.data['tokens'])
        self.assertEqual(User.objects.count(), 1)

    def test_register_returns_user_data(self):
        response = self.client.post(self.url, self._register_data(), format='json')
        self.assertEqual(response.data['user']['email'], 'new@example.com')

    def test_register_password_mismatch(self):
        data = self._register_data(password_confirm='DifferentPass123!')
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_weak_password(self):
        data = self._register_data(password='123', password_confirm='123')
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_duplicate_email(self):
        create_user(email='new@example.com')
        response = self.client.post(self.url, self._register_data(), format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_missing_fields(self):
        response = self.client.post(self.url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class LoginTests(APITestCase):

    def setUp(self):
        self.url = reverse('login')
        self.password = 'TestPass123!'
        self.user = create_user(email='login@example.com', password=self.password)

    def test_login_success(self):
        response = self.client.post(self.url, {
            'email': 'login@example.com',
            'password': self.password,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', response.data)
        self.assertIn('user', response.data)

    def test_login_wrong_password(self):
        response = self.client.post(self.url, {
            'email': 'login@example.com',
            'password': 'WrongPass!',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_nonexistent_user(self):
        response = self.client.post(self.url, {
            'email': 'ghost@example.com',
            'password': 'Whatever123!',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_inactive_user(self):
        self.user.is_active = False
        self.user.save()
        response = self.client.post(self.url, {
            'email': 'login@example.com',
            'password': self.password,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_missing_fields(self):
        response = self.client.post(self.url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class LogoutTests(APITestCase):

    def setUp(self):
        self.url = reverse('logout')
        self.password = 'TestPass123!'
        self.user = create_user(password=self.password)

    def test_logout_success(self):
        auth_client(self.client, self.user, self.password)
        login_resp = self.client.post(reverse('login'), {
            'email': self.user.email,
            'password': self.password,
        }, format='json')
        refresh = login_resp.data['tokens']['refresh']
        response = self.client.post(self.url, {'refresh': refresh}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_logout_without_token(self):
        auth_client(self.client, self.user, self.password)
        response = self.client.post(self.url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_logout_unauthenticated(self):
        response = self.client.post(self.url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class TokenRefreshTests(APITestCase):

    def setUp(self):
        self.url = reverse('token_refresh')
        self.password = 'TestPass123!'
        self.user = create_user(password=self.password)

    def test_refresh_token(self):
        login_resp = self.client.post(reverse('login'), {
            'email': self.user.email,
            'password': self.password,
        }, format='json')
        refresh = login_resp.data['tokens']['refresh']
        response = self.client.post(self.url, {'refresh': refresh}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_refresh_invalid_token(self):
        response = self.client.post(self.url, {'refresh': 'bad-token'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_blacklisted_refresh_token_is_rejected(self):
        """After rotating a refresh token, the original token must be rejected."""
        # Login
        login_resp = self.client.post(reverse('login'), {
            'email': self.user.email, 'password': self.password,
        }, format='json')
        original_refresh = login_resp.data['tokens']['refresh']
        # Rotate (first refresh)
        rotate_resp = self.client.post(reverse('token_refresh'), {
            'refresh': original_refresh,
        }, format='json')
        self.assertEqual(rotate_resp.status_code, status.HTTP_200_OK)
        # Try to use original (now blacklisted) again
        blacklisted_resp = self.client.post(reverse('token_refresh'), {
            'refresh': original_refresh,
        }, format='json')
        self.assertEqual(blacklisted_resp.status_code, status.HTTP_401_UNAUTHORIZED)


class ProfileTests(APITestCase):

    def setUp(self):
        self.url = reverse('profile')
        self.password = 'TestPass123!'
        self.user = create_user(
            email='profile@example.com', password=self.password,
            first_name='John', last_name='Doe')

    def test_get_profile(self):
        auth_client(self.client, self.user, self.password)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'profile@example.com')

    def test_get_profile_unauthenticated(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_profile(self):
        auth_client(self.client, self.user, self.password)
        response = self.client.patch(self.url, {
            'first_name': 'Johnny',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, 'Johnny')

    def test_full_update_profile(self):
        auth_client(self.client, self.user, self.password)
        response = self.client.put(self.url, {
            'first_name': 'Jane',
            'last_name': 'Smith',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, 'Jane')
        self.assertEqual(self.user.last_name, 'Smith')

    def test_profile_update_ignores_email_field(self):
        """PATCH /profile with email should not change the email."""
        auth_client(self.client, self.user, self.password)
        old_email = self.user.email
        response = self.client.patch(
            self.url,
            {'email': 'hacker@example.com', 'first_name': 'Renamed'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, old_email)
        self.assertEqual(self.user.first_name, 'Renamed')


class ChangePasswordTests(APITestCase):

    def setUp(self):
        self.url = reverse('change_password')
        self.password = 'TestPass123!'
        self.user = create_user(password=self.password)

    def test_change_password_success(self):
        auth_client(self.client, self.user, self.password)
        response = self.client.put(self.url, {
            'old_password': self.password,
            'new_password': 'NewStrong456!',
            'new_password_confirm': 'NewStrong456!',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('NewStrong456!'))

    def test_change_password_wrong_old(self):
        auth_client(self.client, self.user, self.password)
        response = self.client.put(self.url, {
            'old_password': 'WrongOld!',
            'new_password': 'NewStrong456!',
            'new_password_confirm': 'NewStrong456!',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_change_password_mismatch(self):
        auth_client(self.client, self.user, self.password)
        response = self.client.put(self.url, {
            'old_password': self.password,
            'new_password': 'NewStrong456!',
            'new_password_confirm': 'Different789!',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_change_password_unauthenticated(self):
        response = self.client.put(self.url, {
            'old_password': self.password,
            'new_password': 'NewStrong456!',
            'new_password_confirm': 'NewStrong456!',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class UserLanguageTests(APITestCase):
    def setUp(self):
        self.url = reverse('user-language')
        self.password = 'TestPass123!'
        self.user = create_user(email='lang@example.com', password=self.password)
        auth_client(self.client, self.user, self.password)

    def test_default_language_is_spanish(self):
        # `create_user` doesn't override language → model default is 'es'.
        self.user.refresh_from_db()
        self.assertEqual(self.user.language, 'es')

    def test_login_response_includes_language(self):
        # Hit /api/auth/login/ to confirm the user shape carries the field.
        login_url = reverse('login')
        response = self.client.post(
            login_url,
            {'email': self.user.email, 'password': self.password},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['language'], 'es')

    def test_register_response_defaults_to_spanish(self):
        register_url = reverse('register')
        response = self.client.post(register_url, {
            'email': 'new.lang@example.com',
            'password': 'StrongPass123!',
            'password_confirm': 'StrongPass123!',
            'first_name': 'X', 'last_name': 'Y',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['user']['language'], 'es')

    def test_patch_self_succeeds(self):
        response = self.client.patch(self.url, {'language': 'en'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['language'], 'en')
        self.user.refresh_from_db()
        self.assertEqual(self.user.language, 'en')

    def test_patch_self_unknown_value_400(self):
        response = self.client.patch(self.url, {'language': 'fr'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertEqual(self.user.language, 'es')

    def test_patch_self_unauthenticated_401(self):
        self.client.credentials()  # drop auth header
        response = self.client.patch(self.url, {'language': 'en'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_patch_self_only_affects_caller(self):
        other = create_user(email='other.lang@example.com')
        self.client.patch(self.url, {'language': 'en'}, format='json')
        other.refresh_from_db()
        self.assertEqual(other.language, 'es')  # unchanged
