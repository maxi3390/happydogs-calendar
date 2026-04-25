from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from feature_flags.models import FeatureFlag
from feature_flags.services import is_feature_enabled
from tests.factories import create_and_auth_user, create_admin

User = get_user_model()


# Keep this in sync with the seed migration — if someone adds a flag and
# forgets to adjust the seed, these tests break loudly.
SEEDED_KEYS = {
    'multiday_schedule',
    'custom_pet_species',
    'vet_management',
    'medical_notes',
    'data_backup',
    'compatibility_warnings',
    'deworming_tracking',
}
ENABLED_BY_DEFAULT = {
    'multiday_schedule',
    'vet_management',
    'medical_notes',
    'data_backup',
    'compatibility_warnings',
}
DISABLED_BY_DEFAULT = {'custom_pet_species', 'deworming_tracking'}


class SeedMigrationTests(TestCase):

    def test_every_canonical_flag_is_seeded(self):
        keys = set(FeatureFlag.objects.values_list('key', flat=True))
        self.assertEqual(keys, SEEDED_KEYS)

    def test_seeded_defaults(self):
        for key in ENABLED_BY_DEFAULT:
            self.assertTrue(
                FeatureFlag.objects.get(key=key).enabled,
                f'{key!r} should be enabled by default',
            )
        for key in DISABLED_BY_DEFAULT:
            self.assertFalse(
                FeatureFlag.objects.get(key=key).enabled,
                f'{key!r} should be disabled by default',
            )

    def test_every_flag_has_label_and_description(self):
        for flag in FeatureFlag.objects.all():
            self.assertTrue(flag.label, f'{flag.key!r} missing label')
            self.assertTrue(flag.description, f'{flag.key!r} missing description')


class ServiceHelperTests(TestCase):

    def test_present_and_enabled(self):
        FeatureFlag.objects.filter(key='vet_management').update(enabled=True)
        self.assertTrue(is_feature_enabled('vet_management'))

    def test_present_and_disabled(self):
        FeatureFlag.objects.filter(key='vet_management').update(enabled=False)
        self.assertFalse(is_feature_enabled('vet_management'))

    def test_missing_key_is_false(self):
        # Fail-closed: unknown keys count as disabled.
        self.assertFalse(is_feature_enabled('some_unknown_key'))


class ListEndpointTests(APITestCase):

    def setUp(self):
        self.user = create_and_auth_user(self.client)
        self.url = reverse('feature-flag-list')

    def test_requires_auth(self):
        self.client.credentials()
        response = self.client.get(self.url)
        self.assertIn(response.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_staff_user_sees_full_list(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        keys = {row['key'] for row in response.data}
        self.assertEqual(keys, SEEDED_KEYS)
        # The default ordering is alphabetical by key.
        ordered_keys = [row['key'] for row in response.data]
        self.assertEqual(ordered_keys, sorted(ordered_keys))


class PatchEndpointTests(APITestCase):

    def setUp(self):
        self.admin = create_admin(password='AdminPass!')
        from django.urls import reverse as _reverse
        resp = self.client.post(_reverse('login'), {
            'email': self.admin.email,
            'password': 'AdminPass!',
        }, format='json')
        token = resp.data['tokens']['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        self.url = reverse('feature-flag-detail', args=['vet_management'])

    def test_admin_can_toggle(self):
        FeatureFlag.objects.filter(key='vet_management').update(enabled=True)
        response = self.client.patch(self.url, {'enabled': False}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['enabled'])
        self.assertFalse(FeatureFlag.objects.get(key='vet_management').enabled)

    def test_key_is_read_only(self):
        response = self.client.patch(
            self.url,
            {'key': 'attempted_rename', 'enabled': False},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # The row is still keyed by its original value.
        self.assertTrue(FeatureFlag.objects.filter(key='vet_management').exists())
        self.assertFalse(FeatureFlag.objects.filter(key='attempted_rename').exists())

    def test_label_and_description_are_read_only(self):
        original = FeatureFlag.objects.get(key='vet_management')
        response = self.client.patch(
            self.url,
            {'label': 'hacked', 'description': 'hacked', 'enabled': True},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        refreshed = FeatureFlag.objects.get(key='vet_management')
        self.assertEqual(refreshed.label, original.label)
        self.assertEqual(refreshed.description, original.description)


class PatchRejectedForNonAdminTests(APITestCase):

    def setUp(self):
        self.user = create_and_auth_user(self.client)
        self.url = reverse('feature-flag-detail', args=['vet_management'])

    def test_non_admin_patch_is_forbidden(self):
        before = FeatureFlag.objects.get(key='vet_management').enabled
        response = self.client.patch(self.url, {'enabled': not before}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        # Unchanged.
        self.assertEqual(FeatureFlag.objects.get(key='vet_management').enabled, before)


class DisallowedMethodsTests(APITestCase):

    def setUp(self):
        self.admin = create_admin(password='AdminPass!')
        from django.urls import reverse as _reverse
        resp = self.client.post(_reverse('login'), {
            'email': self.admin.email,
            'password': 'AdminPass!',
        }, format='json')
        token = resp.data['tokens']['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_post_is_rejected(self):
        response = self.client.post(
            reverse('feature-flag-list'),
            {'key': 'new_flag', 'label': 'X', 'description': 'X', 'enabled': True},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_delete_is_rejected(self):
        response = self.client.delete(reverse('feature-flag-detail', args=['vet_management']))
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_put_is_rejected(self):
        # Full-replace PUT would allow blanking label / description by omission.
        response = self.client.put(
            reverse('feature-flag-detail', args=['vet_management']),
            {'enabled': False},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
