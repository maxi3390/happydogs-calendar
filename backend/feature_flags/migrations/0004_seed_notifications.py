"""Seed the ``notifications`` feature flag.

Master switch for the notifications system. When disabled (the
default for v1) the daily cron is a no-op, the bell icon is not
rendered, and the ``/notifications`` page is unreachable.

``get_or_create`` keeps the migration idempotent — re-running
``migrate`` after the flag has been flipped on in production does
not reset it. The reverse migration is a deliberate no-op so
reverting the migration never silently flips the flag off in
environments that depend on it.
"""
from django.db import migrations


SEED_FLAGS = [
    {
        'key': 'notifications',
        'label': 'Notifications',
        'description': (
            'Master switch for the notifications system. When enabled, '
            'a daily cron job generates per-staff notifications for '
            'upcoming events (vaccinations, arrivals, egress, birthdays, '
            'deworming) and the bell icon + center are visible. Per-kind '
            'toggles live in Settings.'
        ),
        'enabled': False,
    },
]


def seed(apps, schema_editor):
    FeatureFlag = apps.get_model('feature_flags', 'FeatureFlag')
    for data in SEED_FLAGS:
        FeatureFlag.objects.get_or_create(
            key=data['key'],
            defaults={
                'label': data['label'],
                'description': data['description'],
                'enabled': data['enabled'],
            },
        )


def unseed(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('feature_flags', '0003_seed_deworming_tracking'),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]
