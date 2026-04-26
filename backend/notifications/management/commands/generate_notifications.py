"""Daily cron entry point. Materialises ``Notification`` rows for every
event that fires on the target date.

Idempotent: re-running on the same day uses ``get_or_create`` on the
natural key, so no duplicates are produced. Email side-effects are
deferred to the row-by-row consumer that runs only on newly created
rows (see Phase 5 — ``email.py``).
"""

from datetime import date

from django.core.management.base import BaseCommand, CommandError

from notifications.email import deliver
from notifications.services import generate_for_date


class Command(BaseCommand):
    help = "Generate notifications for the given date (defaults to today)."

    def add_arguments(self, parser):
        parser.add_argument(
            '--today', dest='today',
            help="Override the target date (YYYY-MM-DD). Defaults to system date.",
        )
        parser.add_argument(
            '--no-email', action='store_true', default=False,
            help="Skip email delivery (rows are still written).",
        )

    def handle(self, *args, **options):
        if options.get('today'):
            try:
                target = date.fromisoformat(options['today'])
            except ValueError as exc:
                raise CommandError(f"Invalid --today value: {exc}") from exc
        else:
            target = date.today()

        result = generate_for_date(target)
        sent = 0
        if not options['no_email'] and result.created:
            sent = deliver(result.created)
        self.stdout.write(self.style.SUCCESS(
            f"Generated {result.created_count} notification(s); "
            f"{result.existing_count} already existed; "
            f"{sent} email(s) sent."
        ))
