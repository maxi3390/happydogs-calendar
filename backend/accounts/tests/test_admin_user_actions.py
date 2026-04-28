"""Per-user + bulk admin actions on ``UserViewSet``.

Covers the verbs added by the admin-user-management change:

  - deactivate / activate / promote / demote
  - destroy (precondition: target inactive; cannot delete self;
    cannot remove last admin)
  - deletion_impact
  - bulk_{deactivate, activate, delete, set_role}
  - list filters: role, is_active, last_login_within_days, last_login_never

The pre-existing ``test_user_management_api.py`` covers list / retrieve /
update / set_password / non-admin gating; we don't re-prove those here.
"""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from tests.factories import auth_client, create_admin, create_user

User = get_user_model()


def _action_url(name, pk=None):
    """Resolve a DRF DefaultRouter action url by basename + verb."""
    if pk is None:
        return reverse(f'user-{name}')
    return reverse(f'user-{name}', args=[pk])


class _Base(APITestCase):
    """Shared admin / user fixtures.

    Two admins by default so tests that exercise the last-admin guard
    have a "happy path" baseline; the guard is asserted in dedicated
    tests by deleting the second admin to reach the boundary.
    """
    def setUp(self):
        self.admin_password = 'AdminPass123!'
        self.user_password = 'UserPass123!'
        self.admin = create_admin(email='admin1@example.com', password=self.admin_password)
        self.admin2 = create_admin(email='admin2@example.com', password=self.admin_password)
        self.user = create_user(
            email='managed@example.com',
            password=self.user_password,
            first_name='Managed',
            last_name='User',
        )

    def _auth_admin(self):
        auth_client(self.client, self.admin, self.admin_password)

    def _auth_user(self):
        auth_client(self.client, self.user, self.user_password)


class PerUserStateActions(_Base):
    """deactivate / activate / promote / demote happy paths + 403."""

    def test_admin_can_deactivate_user(self):
        self._auth_admin()
        res = self.client.post(_action_url('deactivate', self.user.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)

    def test_admin_can_reactivate_inactive_user(self):
        self.user.is_active = False
        self.user.save(update_fields=['is_active'])
        self._auth_admin()
        res = self.client.post(_action_url('activate', self.user.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_active)

    def test_admin_can_promote_user_to_admin(self):
        self._auth_admin()
        res = self.client.post(_action_url('promote', self.user.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, User.Role.ADMIN)

    def test_admin_can_demote_admin_to_user(self):
        self._auth_admin()
        res = self.client.post(_action_url('demote', self.admin2.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.admin2.refresh_from_db()
        self.assertEqual(self.admin2.role, User.Role.USER)

    def test_non_admin_cannot_call_actions(self):
        self._auth_user()
        for verb in ('deactivate', 'activate', 'promote', 'demote'):
            res = self.client.post(_action_url(verb, self.admin.id))
            self.assertEqual(
                res.status_code, status.HTTP_403_FORBIDDEN,
                f'{verb} should 403 for non-admin',
            )


class SelfProtectionGuards(_Base):
    """An admin SHALL NOT deactivate / demote / delete themselves."""

    def test_admin_cannot_deactivate_self(self):
        self._auth_admin()
        res = self.client.post(_action_url('deactivate', self.admin.id))
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.is_active)

    def test_admin_cannot_demote_self(self):
        self._auth_admin()
        res = self.client.post(_action_url('demote', self.admin.id))
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.admin.refresh_from_db()
        self.assertEqual(self.admin.role, User.Role.ADMIN)

    def test_admin_cannot_delete_self(self):
        # Use force_authenticate so we can drive the request as a
        # would-be deactivated admin (JWT auth refuses inactive users
        # before our view-level self-guard fires; force_authenticate
        # bypasses the auth backend so we can isolate the guard).
        User.objects.filter(pk=self.admin.id).update(is_active=False)
        self.client.force_authenticate(user=self.admin)
        res = self.client.delete(reverse('user-detail', args=[self.admin.id]))
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(User.objects.filter(pk=self.admin.id).exists())


class LastAdminGuard(_Base):
    """The system SHALL refuse to leave zero active admins.

    Under normal operation the guard is unreachable: an active admin
    is always making the request, and self-guard catches them being
    in the affected ids. The guard exists as defence-in-depth — these
    tests use ``force_authenticate`` to drive requests as a would-be
    deactivated admin (which JWT auth would normally refuse), so the
    last-admin code path is exercised in isolation.
    """

    def test_cannot_demote_last_active_admin(self):
        # Make self.admin inactive but still drive the request as them
        # via force_authenticate. Active admins are now {admin2} only.
        # Demoting admin2 → zero, guard fires.
        User.objects.filter(pk=self.admin.id).update(is_active=False)
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(_action_url('demote', self.admin2.id))
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.admin2.refresh_from_db()
        self.assertEqual(self.admin2.role, User.Role.ADMIN)

    def test_cannot_deactivate_last_active_admin(self):
        User.objects.filter(pk=self.admin.id).update(is_active=False)
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(_action_url('deactivate', self.admin2.id))
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.admin2.refresh_from_db()
        self.assertTrue(self.admin2.is_active)

    def test_cannot_delete_admin_when_no_active_admin_remains(self):
        # Both admins inactive (delete requires inactive target).
        # Active-admin pool is empty; deleting admin2 leaves it
        # empty. Guard rejects.
        User.objects.filter(pk=self.admin.id).update(is_active=False)
        User.objects.filter(pk=self.admin2.id).update(is_active=False)
        self.client.force_authenticate(user=self.admin)
        res = self.client.delete(reverse('user-detail', args=[self.admin2.id]))
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(User.objects.filter(pk=self.admin2.id).exists())


class DestroyRequiresInactive(_Base):
    """``DELETE /api/users/<id>/`` refuses while target is active."""

    def test_delete_active_user_returns_400(self):
        self._auth_admin()
        res = self.client.delete(reverse('user-detail', args=[self.user.id]))
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(User.objects.filter(pk=self.user.id).exists())

    def test_delete_inactive_user_succeeds(self):
        self.user.is_active = False
        self.user.save(update_fields=['is_active'])
        self._auth_admin()
        res = self.client.delete(reverse('user-detail', args=[self.user.id]))
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(pk=self.user.id).exists())


class DeletionImpactEndpoint(_Base):
    """GET /api/users/<id>/deletion_impact/ returns counts."""

    def test_returns_zero_counts_for_unrelated_user(self):
        self._auth_admin()
        res = self.client.get(_action_url('deletion-impact', self.user.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data, {'notifications': 0, 'audit_log_entries': 0})


class FilterTests(_Base):
    """``GET /api/users/`` honours ``role`` / ``is_active`` / ``last_login_*``."""

    def test_filter_by_role(self):
        self._auth_admin()
        res = self.client.get(reverse('user-list'), {'role': 'admin'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = {u['id'] for u in res.data}
        self.assertEqual(ids, {self.admin.id, self.admin2.id})

    def test_filter_by_is_active(self):
        self.user.is_active = False
        self.user.save(update_fields=['is_active'])
        self._auth_admin()
        res = self.client.get(reverse('user-list'), {'is_active': 'false'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual([u['id'] for u in res.data], [self.user.id])

    def test_filter_last_login_within_days(self):
        # ``self.admin`` logged in just now via _auth_admin's token call;
        # set timestamps explicitly so the test doesn't depend on order.
        now = timezone.now()
        User.objects.filter(pk=self.admin.id).update(last_login=now - timedelta(days=2))
        User.objects.filter(pk=self.admin2.id).update(last_login=now - timedelta(days=40))
        User.objects.filter(pk=self.user.id).update(last_login=None)
        self._auth_admin()
        res = self.client.get(reverse('user-list'), {'last_login_within_days': '7'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual([u['id'] for u in res.data], [self.admin.id])

    def test_filter_last_login_never(self):
        User.objects.filter(pk=self.user.id).update(last_login=None)
        User.objects.filter(pk=self.admin.id).update(last_login=timezone.now())
        User.objects.filter(pk=self.admin2.id).update(last_login=timezone.now())
        self._auth_admin()
        res = self.client.get(reverse('user-list'), {'last_login_never': 'true'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual([u['id'] for u in res.data], [self.user.id])


class BulkActionTests(_Base):
    """bulk_{deactivate, activate, delete, set_role}."""

    def test_bulk_deactivate_succeeds(self):
        u2 = create_user(email='u2@example.com')
        self._auth_admin()
        res = self.client.post(
            _action_url('bulk-deactivate'),
            {'ids': [self.user.id, u2.id]},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['updated'], 2)
        self.user.refresh_from_db()
        u2.refresh_from_db()
        self.assertFalse(self.user.is_active)
        self.assertFalse(u2.is_active)

    def test_bulk_deactivate_rejects_self(self):
        self._auth_admin()
        res = self.client.post(
            _action_url('bulk-deactivate'),
            {'ids': [self.admin.id, self.user.id]},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_active, 'partial update must NOT have happened')

    def test_bulk_delete_refuses_active_targets(self):
        self._auth_admin()
        res = self.client.post(
            _action_url('bulk-delete'),
            {'ids': [self.user.id]},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(User.objects.filter(pk=self.user.id).exists())

    def test_bulk_delete_succeeds_for_inactive_targets(self):
        self.user.is_active = False
        self.user.save(update_fields=['is_active'])
        self._auth_admin()
        res = self.client.post(
            _action_url('bulk-delete'),
            {'ids': [self.user.id]},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['deleted'], 1)
        self.assertFalse(User.objects.filter(pk=self.user.id).exists())

    def test_bulk_set_role_refuses_to_demote_all_admins(self):
        # Both admins, demoted in one call → zero active admins. Refuse.
        self._auth_admin()
        res = self.client.post(
            _action_url('bulk-set-role'),
            {'ids': [self.admin.id, self.admin2.id], 'role': 'user'},
            format='json',
        )
        # The admin trying to demote includes themselves → blocked by
        # self-guard before reaching the last-admin check.
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        # Try again without self in the list — bulk demote of admin2
        # alone is fine because self.admin remains.
        res = self.client.post(
            _action_url('bulk-set-role'),
            {'ids': [self.admin2.id], 'role': 'user'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.admin2.refresh_from_db()
        self.assertEqual(self.admin2.role, User.Role.USER)

    def test_bulk_set_role_promote_succeeds(self):
        self._auth_admin()
        res = self.client.post(
            _action_url('bulk-set-role'),
            {'ids': [self.user.id], 'role': 'admin'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, User.Role.ADMIN)

    def test_bulk_ids_must_be_list_of_ints(self):
        self._auth_admin()
        res = self.client.post(
            _action_url('bulk-activate'),
            {'ids': 'not-a-list'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
