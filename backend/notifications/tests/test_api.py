from datetime import date, timedelta

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from notifications.models import (
    Notification,
    NotificationPreference,
    NotificationTemplate,
)
from tests.factories import create_pet, create_owner, create_and_auth_user, create_user


class _BaseNotificationsTest(APITestCase):
    def setUp(self):
        self.user = create_and_auth_user(self.client)
        # Second user — used for cross-user tests (no client auth needed,
        # we just need a different recipient_user FK).
        self.other_user = create_user()
        self.owner = create_owner(email='owner@example.com', phone='+5491165432109')
        self.pet = create_pet(owner=self.owner, name='Luna')


class NotificationListAPITests(_BaseNotificationsTest):
    def setUp(self):
        super().setUp()
        self.url = reverse('notification-list')

    def _make(self, **overrides):
        defaults = {
            'kind': Notification.KIND_PET_BIRTHDAY,
            'pet': self.pet,
            'event_date': date.today(),
            'recipient_user': self.user,
            'payload': {'pet_name': 'Luna'},
        }
        defaults.update(overrides)
        return Notification.objects.create(**defaults)

    def test_list_returns_only_own_undismissed(self):
        n1 = self._make()
        n2 = self._make(event_date=date.today() + timedelta(days=1))
        # Other user's notification — must not be visible.
        self._make(recipient_user=self.other_user)
        # Dismissed — must not be visible.
        from django.utils import timezone
        self._make(dismissed_at=timezone.now())
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = {row['id'] for row in response.data}
        self.assertEqual(ids, {n1.id, n2.id})

    def test_unread_only_filter(self):
        n_unread = self._make()
        from django.utils import timezone
        self._make(read_at=timezone.now())
        response = self.client.get(self.url, {'unread_only': '1'})
        ids = {row['id'] for row in response.data}
        self.assertEqual(ids, {n_unread.id})

    def test_birthday_row_carries_forward_block(self):
        self._make()
        response = self.client.get(self.url)
        row = response.data[0]
        self.assertIsNotNone(row['forward'])
        # treatment_due / pet_birthday templates start empty → falls
        # back to localised default key (frontend resolves it).
        self.assertEqual(row['forward']['email']['to'], 'owner@example.com')
        self.assertEqual(row['forward']['whatsapp']['phone'], '+5491165432109')

    def test_internal_only_kind_has_null_forward(self):
        self._make(kind=Notification.KIND_PET_ARRIVING_TODAY)
        response = self.client.get(self.url)
        row = response.data[0]
        self.assertIsNone(row['forward'])

    def test_owner_without_email_clears_forward_to(self):
        self.owner.email = ''
        self.owner.save()
        self._make()
        response = self.client.get(self.url)
        row = response.data[0]
        self.assertIsNone(row['forward']['email']['to'])
        # Phone is still present — only the affected button hides.
        self.assertEqual(row['forward']['whatsapp']['phone'], '+5491165432109')

    def test_operator_template_overrides_default(self):
        # Configure the pet_birthday template.
        NotificationTemplate.objects.create(
            scope='pet_birthday',
            email_subject='Happy birthday from us!',
            email_body='Hi, {pet_name} is celebrating today!',
            whatsapp_text='🎉 {pet_name} 🎂',
        )
        self._make()
        response = self.client.get(self.url)
        row = response.data[0]
        self.assertEqual(row['forward']['email']['subject'], 'Happy birthday from us!')
        self.assertEqual(row['forward']['email']['body'], 'Hi, Luna is celebrating today!')
        self.assertEqual(row['forward']['whatsapp']['text'], '🎉 Luna 🎂')

    def test_unknown_placeholder_renders_literal(self):
        NotificationTemplate.objects.create(
            scope='pet_birthday',
            email_body='Hi {nonexistent}, {pet_name}!',
        )
        self._make()
        response = self.client.get(self.url)
        row = response.data[0]
        # Operator typo'd: '{nonexistent}' stays as literal, '{pet_name}' substituted.
        self.assertEqual(row['forward']['email']['body'], 'Hi {nonexistent}, Luna!')


class NotificationActionsAPITests(_BaseNotificationsTest):
    def setUp(self):
        super().setUp()
        self.notif = Notification.objects.create(
            kind=Notification.KIND_PET_BIRTHDAY,
            pet=self.pet,
            event_date=date.today(),
            recipient_user=self.user,
            payload={'pet_name': 'Luna'},
        )

    def test_mark_read_sets_read_at(self):
        url = reverse('notification-mark-read', args=[self.notif.id])
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.notif.refresh_from_db()
        self.assertIsNotNone(self.notif.read_at)

    def test_mark_read_is_idempotent(self):
        url = reverse('notification-mark-read', args=[self.notif.id])
        self.client.post(url)
        first = Notification.objects.get(pk=self.notif.id).read_at
        self.client.post(url)
        second = Notification.objects.get(pk=self.notif.id).read_at
        self.assertEqual(first, second)

    def test_dismiss_sets_dismissed_at(self):
        url = reverse('notification-dismiss', args=[self.notif.id])
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.notif.refresh_from_db()
        self.assertIsNotNone(self.notif.dismissed_at)

    def test_dismiss_all_only_affects_own(self):
        # Bob has 2 notifications too.
        for _ in range(2):
            Notification.objects.create(
                kind=Notification.KIND_PET_BIRTHDAY,
                pet=self.pet,
                event_date=date.today(),
                recipient_user=self.other_user,
                payload={'pet_name': 'Luna'},
            )
        url = reverse('notification-dismiss-all')
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['dismissed'], 1)
        # Bob's are untouched.
        self.assertEqual(
            Notification.objects.filter(
                recipient_user=self.other_user, dismissed_at__isnull=True,
            ).count(),
            2,
        )

    def test_cross_user_dismiss_is_404(self):
        other_notif = Notification.objects.create(
            kind=Notification.KIND_PET_BIRTHDAY,
            pet=self.pet,
            event_date=date.today(),
            recipient_user=self.other_user,
            payload={'pet_name': 'Luna'},
        )
        url = reverse('notification-dismiss', args=[other_notif.id])
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        other_notif.refresh_from_db()
        self.assertIsNone(other_notif.dismissed_at)

    def test_mark_all_read_only_affects_own_unread(self):
        from django.utils import timezone
        # Self.notif is unread; create one already-read row, one
        # dismissed row, and one for the other user — none of them
        # should be touched by the bulk action.
        already_read = Notification.objects.create(
            kind=Notification.KIND_PET_BIRTHDAY,
            pet=self.pet, event_date=date.today() + timedelta(days=1),
            recipient_user=self.user, payload={'pet_name': 'Luna'},
            read_at=timezone.now(),
        )
        dismissed = Notification.objects.create(
            kind=Notification.KIND_PET_BIRTHDAY,
            pet=self.pet, event_date=date.today() + timedelta(days=2),
            recipient_user=self.user, payload={'pet_name': 'Luna'},
            dismissed_at=timezone.now(),
        )
        other = Notification.objects.create(
            kind=Notification.KIND_PET_BIRTHDAY,
            pet=self.pet, event_date=date.today(),
            recipient_user=self.other_user, payload={'pet_name': 'Luna'},
        )
        url = reverse('notification-mark-all-read')
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['marked_read'], 1)

        self.notif.refresh_from_db()
        self.assertIsNotNone(self.notif.read_at)

        # The already-read row's read_at SHOULD NOT change.
        before = already_read.read_at
        already_read.refresh_from_db()
        self.assertEqual(already_read.read_at, before)

        # Dismissed rows are excluded.
        dismissed.refresh_from_db()
        self.assertIsNone(dismissed.read_at)

        # Other user's notification is untouched.
        other.refresh_from_db()
        self.assertIsNone(other.read_at)

    def test_mark_all_read_returns_zero_when_no_unread(self):
        # The single notification in setUp is unread; mark it first.
        self.client.post(reverse('notification-mark-all-read'))
        # Second call should report 0.
        response = self.client.post(reverse('notification-mark-all-read'))
        self.assertEqual(response.data['marked_read'], 0)


class NotificationPreferenceAPITests(_BaseNotificationsTest):
    def setUp(self):
        super().setUp()
        self.url = reverse('notification-preferences')

    def test_get_creates_default(self):
        self.assertFalse(NotificationPreference.objects.filter(user=self.user).exists())
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['email_enabled'])
        self.assertTrue(NotificationPreference.objects.filter(user=self.user).exists())

    def test_patch_updates(self):
        response = self.client.patch(self.url, {'email_enabled': False}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['email_enabled'])
        prefs = NotificationPreference.objects.get(user=self.user)
        self.assertFalse(prefs.email_enabled)


class NotificationTemplateAPITests(_BaseNotificationsTest):
    def setUp(self):
        super().setUp()
        self.url = reverse('notification-template-list')

    def test_list_materialises_both_scopes(self):
        self.assertFalse(NotificationTemplate.objects.exists())
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        scopes = sorted(row['scope'] for row in response.data)
        self.assertEqual(scopes, ['pet_birthday', 'treatment_due'])
        # All fields empty by default.
        for row in response.data:
            self.assertEqual(row['email_subject'], '')
            self.assertEqual(row['email_body'], '')
            self.assertEqual(row['whatsapp_text'], '')

    def test_patch_updates_treatment_due(self):
        # First materialise.
        self.client.get(self.url)
        url = reverse('notification-template-detail', args=['treatment_due'])
        response = self.client.patch(
            url,
            {'email_subject': 'Reminder', 'whatsapp_text': 'Hi {pet_name}'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email_subject'], 'Reminder')
        self.assertEqual(response.data['whatsapp_text'], 'Hi {pet_name}')
        # email_body wasn't touched.
        self.assertEqual(response.data['email_body'], '')

    def test_post_is_rejected(self):
        response = self.client.post(
            self.url,
            {'scope': 'made_up', 'email_subject': 'x'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_delete_is_rejected(self):
        self.client.get(self.url)  # materialise
        url = reverse('notification-template-detail', args=['treatment_due'])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


class TemplatingHelperTests(APITestCase):
    """Direct unit tests for the SafeDict-based render() helper."""

    def test_render_substitutes_known_placeholders(self):
        from notifications.templating import render
        out = render('Hi {pet_name}!', {'pet_name': 'Luna'})
        self.assertEqual(out, 'Hi Luna!')

    def test_render_keeps_unknown_placeholders_literal(self):
        from notifications.templating import render
        out = render('Hi {nonexistent}, {pet_name}!', {'pet_name': 'Luna'})
        self.assertEqual(out, 'Hi {nonexistent}, Luna!')

    def test_render_empty_string_returns_empty(self):
        from notifications.templating import render
        self.assertEqual(render('', {}), '')
