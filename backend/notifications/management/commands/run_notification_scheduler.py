"""Long-running scheduler for the notifications cron container.

Polls the wall clock once per minute. When ``now`` is at or past
``NurserySetting.notifications_run_time`` AND no notification has yet
been generated for ``today``, fires ``generate_notifications``.

This is intentionally simple: a polling loop instead of celery /
django-q so the deployment stays at "just docker compose". The
container restart policy supplies the resilience.
"""

from datetime import datetime
import logging
import time

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.utils import timezone

from feature_flags.services import is_feature_enabled
from notifications.models import Notification
from nursery_settings.models import NurserySetting

logger = logging.getLogger(__name__)

CONSOLE_BACKEND_WARNING = (
    "WARNING: notifications flag is on but EMAIL_BACKEND is the dev "
    "console backend; staff emails are being printed to stdout, not "
    "sent. Set EMAIL_BACKEND / EMAIL_HOST / EMAIL_HOST_USER / "
    "EMAIL_HOST_PASSWORD in your .env to enable real delivery."
)


def _maybe_warn_about_console_backend():
    """One-shot startup warning for the prod-stack-with-default-mailbackend footgun.

    When the master ``notifications`` flag is enabled but
    ``EMAIL_BACKEND`` still points at the console backend, the cron
    will fan emails out to stdout and the operator will only learn
    about the silent failure when staff complain weeks later. Surface
    it loudly at boot so observability tooling can catch it.
    """
    backend = settings.EMAIL_BACKEND or ''
    if not backend.endswith('.console.EmailBackend'):
        return
    if not is_feature_enabled('notifications'):
        return
    logger.warning(CONSOLE_BACKEND_WARNING)


class Command(BaseCommand):
    help = "Continuously poll for the daily notification cron run time."

    def add_arguments(self, parser):
        parser.add_argument(
            '--interval', type=int, default=60,
            help='Seconds to sleep between checks (default: 60).',
        )
        parser.add_argument(
            '--once', action='store_true',
            help='Evaluate the schedule once and exit (used by tests).',
        )

    def handle(self, *args, **options):
        interval = options['interval']
        once = options['once']
        self.stdout.write(self.style.SUCCESS(
            f"Notification scheduler running (interval={interval}s)."
        ))
        _maybe_warn_about_console_backend()
        while True:
            try:
                self._tick()
            except Exception:
                logger.exception("Scheduler tick failed")
            if once:
                return
            time.sleep(interval)

    def _tick(self):
        s = NurserySetting.load()
        now = timezone.localtime()
        today = now.date()
        if now.time() < s.notifications_run_time:
            return
        if Notification.objects.filter(created_at__date=today).exists():
            return
        self.stdout.write(self.style.NOTICE(
            f"[{datetime.now().isoformat()}] firing generate_notifications "
            f"for {today.isoformat()}"
        ))
        call_command('generate_notifications', '--today', today.isoformat())
