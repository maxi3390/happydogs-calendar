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
        # Deletion requires the target to be inactive — set the flag
        # first via direct DB write, then DELETE. Coverage for the
        # full lifecycle (deactivate via the action endpoint, then
        # delete) lives in test_admin_user_actions.py.
        self.user.is_active = False
        self.user.save(update_fields=['is_active'])
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

    # ── Admin set_password ─────────────────────────────────────────────

    def _set_password_url(self, pk):
        return reverse('user-set-password', args=[pk])

    def test_admin_can_reset_user_password_and_login_with_new_one(self):
        self._auth_admin()
        new_password = 'NewSecure123!'
        response = self.client.post(
            self._set_password_url(self.user.id),
            {'new_password': new_password, 'new_password_confirm': new_password},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(new_password))
        self.assertFalse(self.user.check_password(self.user_password))

    def test_admin_reset_password_mismatch_400(self):
        self._auth_admin()
        response = self.client.post(
            self._set_password_url(self.user.id),
            {'new_password': 'NewSecure123!', 'new_password_confirm': 'TypoSecure123!'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('new_password_confirm', response.data)

    def test_admin_reset_password_weak_400(self):
        self._auth_admin()
        # '1234' fails Django's MinimumLengthValidator and
        # NumericPasswordValidator at the same time.
        response = self.client.post(
            self._set_password_url(self.user.id),
            {'new_password': '1234', 'new_password_confirm': '1234'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('new_password', response.data)

    def test_non_admin_cannot_reset_user_password_403(self):
        self._auth_user()
        response = self.client.post(
            self._set_password_url(self.admin.id),
            {'new_password': 'NewSecure123!', 'new_password_confirm': 'NewSecure123!'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_reset_user_password_401(self):
        response = self.client.post(
            self._set_password_url(self.user.id),
            {'new_password': 'NewSecure123!', 'new_password_confirm': 'NewSecure123!'},
            format='json',
        )
        # DRF returns 401 with the default JWT auth header missing.
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    def test_admin_can_reset_own_password_via_admin_endpoint(self):
        # Admin overriding their own user id via the admin endpoint
        # SHALL succeed without supplying the old password — the
        # endpoint's whole point is to bypass the old-password check.
        self._auth_admin()
        new_password = 'AdminNewSecure456!'
        response = self.client.post(
            self._set_password_url(self.admin.id),
            {'new_password': new_password, 'new_password_confirm': new_password},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.check_password(new_password))
