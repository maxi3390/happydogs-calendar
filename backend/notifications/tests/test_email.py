from datetime import date, timedelta
from io import StringIO

from django.core import mail
from django.core.management import call_command
from django.test import TestCase, override_settings

from feature_flags.models import FeatureFlag
from notifications.email import deliver, _resolve_default
from notifications.models import (
    Notification,
    NotificationPreference,
    NotificationTemplate,
)
from tests.factories import create_owner, create_pet, create_user


TODAY = date(2025, 6, 15)


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class _BaseEmailTest(TestCase):
    def setUp(self):
        FeatureFlag.objects.update_or_create(
            key='notifications', defaults={'enabled': True},
        )
        mail.outbox = []
        self.alice = create_user(email='alice@example.com')
        self.bob = create_user(email='bob@example.com')
        self.owner = create_owner(email='o@example.com', phone='+1')
        self.pet = create_pet(owner=self.owner, name='Luna')


class DeliveryTests(_BaseEmailTest):
    def _birthday_for(self, user):
        return Notification.objects.create(
            kind=Notification.KIND_PET_BIRTHDAY,
            pet=self.pet, event_date=TODAY, recipient_user=user,
            payload={'pet_name': 'Luna', 'age_years': 3,
                     'owner_first_name': 'Pat', 'owner_last_name': 'Q'},
        )

    def test_sends_one_email_per_recipient(self):
        n_a = self._birthday_for(self.alice)
        n_b = self._birthday_for(self.bob)
        sent = deliver([n_a, n_b])
        self.assertEqual(sent, 2)
        self.assertEqual(len(mail.outbox), 2)
        recipients = {m.to[0] for m in mail.outbox}
        self.assertEqual(recipients, {'alice@example.com', 'bob@example.com'})

    def test_uses_localised_default_when_no_template(self):
        n = self._birthday_for(self.alice)
        deliver([n])
        msg = mail.outbox[0]
        self.assertIn('Luna', msg.subject)
        self.assertIn('birthday', msg.subject.lower())
        self.assertIn('Luna turns 3', msg.body)

    def test_operator_template_overrides_default(self):
        NotificationTemplate.objects.update_or_create(
            scope=NotificationTemplate.SCOPE_PET_BIRTHDAY,
            defaults={
                'email_subject': 'Custom: {pet_name}!',
                'email_body': 'Custom body for {pet_name} ({age_years}).',
            },
        )
        n = self._birthday_for(self.alice)
        deliver([n])
        msg = mail.outbox[0]
        self.assertEqual(msg.subject, 'Custom: Luna!')
        self.assertIn('Custom body for Luna (3).', msg.body)

    def test_email_disabled_skips(self):
        NotificationPreference.objects.create(
            user=self.alice, email_enabled=False,
        )
        n = self._birthday_for(self.alice)
        sent = deliver([n])
        self.assertEqual(sent, 0)
        self.assertEqual(len(mail.outbox), 0)

    def test_user_without_email_skipped(self):
        self.alice.email = ''
        self.alice.save()
        n = self._birthday_for(self.alice)
        sent = deliver([n])
        self.assertEqual(sent, 0)

    def test_internal_only_kind_uses_kind_default(self):
        # Arrival kind has no template scope; falls back to per-kind
        # localised default.
        n = Notification.objects.create(
            kind=Notification.KIND_PET_ARRIVING_TODAY,
            pet=self.pet, event_date=TODAY, recipient_user=self.alice,
            payload={'pet_name': 'Luna',
                     'start_time': '09:00', 'end_time': '17:00'},
        )
        deliver([n])
        msg = mail.outbox[0]
        self.assertIn('Luna', msg.subject)
        self.assertIn('arrives today', msg.subject.lower())
        self.assertIn('09:00', msg.body)


class ResolveDefaultTests(TestCase):
    def test_known_key_renders_with_payload(self):
        out = _resolve_default(
            'notifications.staff_email.pet_birthday.subject',
            {'pet_name': 'Luna'},
        )
        self.assertIn('Luna', out)

    def test_missing_key_returns_empty_string(self):
        out = _resolve_default(
            'notifications.staff_email.does_not_exist.subject', {},
        )
        self.assertEqual(out, '')


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class CommandIntegrationTests(_BaseEmailTest):
    def test_command_delivers_email_for_new_rows(self):
        # Create a pet whose birthday is today.
        create_pet(
            owner=self.owner, name='Spot',
            birth_date=date(TODAY.year - 5, TODAY.month, TODAY.day),
        )
        out = StringIO()
        call_command(
            'generate_notifications', '--today', TODAY.isoformat(), stdout=out,
        )
        # 1 birthday × 2 staff users = 2 emails.
        self.assertEqual(len(mail.outbox), 2)
        self.assertIn('email(s) sent', out.getvalue())

    def test_no_email_flag_suppresses_delivery(self):
        create_pet(
            owner=self.owner,
            birth_date=date(TODAY.year - 1, TODAY.month, TODAY.day),
        )
        call_command(
            'generate_notifications', '--today', TODAY.isoformat(),
            '--no-email',
        )
        self.assertEqual(len(mail.outbox), 0)
        # But rows were still created.
        self.assertEqual(Notification.objects.count(), 2)

    def test_re_running_does_not_resend(self):
        create_pet(
            owner=self.owner,
            birth_date=date(TODAY.year - 2, TODAY.month, TODAY.day),
        )
        call_command(
            'generate_notifications', '--today', TODAY.isoformat(),
        )
        self.assertEqual(len(mail.outbox), 2)
        mail.outbox = []
        # Second run finds the same rows already in DB → no new emails.
        call_command(
            'generate_notifications', '--today', TODAY.isoformat(),
        )
        self.assertEqual(len(mail.outbox), 0)
