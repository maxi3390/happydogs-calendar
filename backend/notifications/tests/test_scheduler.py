from datetime import date, datetime, time, timezone as dt_timezone
from io import StringIO
from unittest import mock

from django.core.management import call_command
from django.test import TestCase, override_settings

from feature_flags.models import FeatureFlag
from notifications.management.commands.run_notification_scheduler import (
    CONSOLE_BACKEND_WARNING,
)
from notifications.models import Notification
from nursery_settings.models import NurserySetting
from tests.factories import create_owner, create_pet, create_user


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class SchedulerTests(TestCase):
    def setUp(self):
        FeatureFlag.objects.update_or_create(
            key='notifications', defaults={'enabled': True},
        )
        self.user = create_user(email='u@example.com')
        self.owner = create_owner()
        # Pet with a birthday matching the scheduler's mocked "today"
        # (June 15, 2025 — see SchedulerTests.test_fires_at_or_after_run_time).
        self.pet = create_pet(
            owner=self.owner,
            birth_date=date(2021, 6, 15),
        )
        s = NurserySetting.load()
        s.notifications_run_time = time(7, 0)
        s.save()

    @mock.patch('notifications.management.commands.run_notification_scheduler.timezone.localtime')
    def test_does_nothing_before_run_time(self, mock_now):
        mock_now.return_value = datetime(
            2025, 6, 15, 6, 30, tzinfo=dt_timezone.utc,
        )
        call_command('run_notification_scheduler', '--once', '--interval', '0')
        self.assertEqual(Notification.objects.count(), 0)

    @mock.patch('notifications.management.commands.run_notification_scheduler.timezone.localtime')
    def test_fires_at_or_after_run_time(self, mock_now):
        mock_now.return_value = datetime(
            2025, 6, 15, 7, 30, tzinfo=dt_timezone.utc,
        )
        call_command('run_notification_scheduler', '--once', '--interval', '0')
        # Birthday today × 1 staff user = 1 row.
        self.assertEqual(Notification.objects.count(), 1)

    @mock.patch('notifications.management.commands.run_notification_scheduler.timezone.localtime')
    def test_does_not_re_fire_same_day(self, mock_now):
        mock_now.return_value = datetime(
            2025, 6, 15, 7, 30, tzinfo=dt_timezone.utc,
        )
        call_command('run_notification_scheduler', '--once', '--interval', '0')
        before = Notification.objects.count()
        # Re-tick later in the same day → no new rows.
        mock_now.return_value = datetime(
            2025, 6, 15, 9, 0, tzinfo=dt_timezone.utc,
        )
        call_command('run_notification_scheduler', '--once', '--interval', '0')
        self.assertEqual(Notification.objects.count(), before)

    @mock.patch('notifications.management.commands.run_notification_scheduler.timezone.localtime')
    def test_logs_friendly_message_on_fire(self, mock_now):
        mock_now.return_value = datetime(
            2025, 6, 15, 7, 30, tzinfo=dt_timezone.utc,
        )
        out = StringIO()
        call_command(
            'run_notification_scheduler', '--once', '--interval', '0',
            stdout=out,
        )
        self.assertIn('firing generate_notifications', out.getvalue())


# Cron-startup warnings are independent of any actual scheduling, so
# the tests below skip the time-mocking the suite above relies on and
# just verify the warning fires (or doesn't) under each combination of
# EMAIL_BACKEND × `notifications` flag.
class ConsoleBackendStartupWarningTests(TestCase):
    LOGGER = (
        'notifications.management.commands.run_notification_scheduler'
    )

    def _set_flag(self, enabled: bool) -> None:
        FeatureFlag.objects.update_or_create(
            key='notifications', defaults={'enabled': enabled},
        )

    @override_settings(EMAIL_BACKEND='django.core.mail.backends.console.EmailBackend')
    def test_warns_when_console_backend_and_flag_on(self):
        self._set_flag(True)
        with self.assertLogs(self.LOGGER, level='WARNING') as cm:
            call_command(
                'run_notification_scheduler', '--once', '--interval', '0',
            )
        joined = '\n'.join(cm.output)
        self.assertIn(CONSOLE_BACKEND_WARNING, joined)

    @override_settings(EMAIL_BACKEND='django.core.mail.backends.console.EmailBackend')
    def test_silent_when_console_backend_but_flag_off(self):
        self._set_flag(False)
        with self.assertNoLogs(self.LOGGER, level='WARNING'):
            call_command(
                'run_notification_scheduler', '--once', '--interval', '0',
            )

    @override_settings(EMAIL_BACKEND='django.core.mail.backends.smtp.EmailBackend')
    def test_silent_when_real_backend_even_with_flag_on(self):
        self._set_flag(True)
        with self.assertNoLogs(self.LOGGER, level='WARNING'):
            call_command(
                'run_notification_scheduler', '--once', '--interval', '0',
            )
