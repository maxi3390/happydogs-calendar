from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from tests.factories import create_user, create_admin, auth_client

User = get_user_model()


class UserViewSetTests(APITestCase):
    """Admin-only user management endpoints."""

    def setUp(self):
        self.admin_password = 'AdminPass123!'
        self.user_password = 'UserPass123!'
        self.admin = create_admin(password=self.admin_password)
        self.user = create_user(email='managed@example.com', password=self.user_password,
                                first_name='Managed', last_name='User')
        self.list_url = reverse('user-list')
        self.detail_url = reverse('user-detail', args=[self.user.id])
        self.me_url = reverse('user-me')

    def _auth_admin(self):
        auth_client(self.client, self.admin, self.admin_password)

    def _auth_user(self):
        auth_client(self.client, self.user, self.user_password)

    # ── List ───────────────────────────────────────────────────────────

    def test_admin_can_list_users(self):
        self._auth_admin()
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_regular_user_cannot_list_users(self):
        self._auth_user()
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_list_users(self):
        response = self.client.get(self.list_url)
        self.assertIn(response.status_code,
                      [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    # ── Retrieve ───────────────────────────────────────────────────────

    def test_admin_can_retrieve_user(self):
        self._auth_admin()
        response = self.client.get(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'managed@example.com')

    def test_regular_user_cannot_retrieve_other(self):
        self._auth_user()
        admin_url = reverse('user-detail', args=[self.admin.id])
        response = self.client.get(admin_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ── Update ─────────────────────────────────────────────────────────

    def test_admin_can_update_user_role(self):
        self._auth_admin()
        response = self.client.patch(self.detail_url, {
            'role': 'admin',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, 'admin')

    def test_admin_can_deactivate_user(self):
        self._auth_admin()
        response = self.client.patch(self.detail_url, {
            'is_active': False,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)

    def test_regular_user_cannot_update_others(self):
        self._auth_user()
        response = self.client.patch(self.detail_url, {
            'role': 'admin',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ── Delete ─────────────────────────────────────────────────────────

    def test_admin_can_delete_user(self):
        self._auth_admin()
        response = self.client.delete(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(pk=self.user.id).exists())

    def test_regular_user_cannot_delete(self):
        self._auth_user()
        response = self.client.delete(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ── Me endpoint ────────────────────────────────────────────────────

    def test_me_endpoint_authenticated(self):
        self._auth_user()
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], self.user.email)

    def test_me_endpoint_admin(self):
        self._auth_admin()
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], self.admin.email)

    def test_me_endpoint_unauthenticated(self):
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
