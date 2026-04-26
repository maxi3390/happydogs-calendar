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

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.utils import timezone

from notifications.models import Notification
from nursery_settings.models import NurserySetting

logger = logging.getLogger(__name__)


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
