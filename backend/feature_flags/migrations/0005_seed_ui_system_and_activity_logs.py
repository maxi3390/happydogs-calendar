"""Seed the ``ui_system`` and ``activity_logs`` feature flags.

Both gate admin-only surfaces that until now were always-on for
admins:

* ``ui_system`` — Hides the ``/ui-system`` developer reference page and
  its nav entry. Default ``enabled = False`` because that page is a
  living style-guide for engineers, not a customer surface; nurseries
  shouldn't see it unless an operator turns it on.

* ``activity_logs`` — Hides the ``/admin/activity`` cross-entity audit
  feed (page + nav entry + ``GET /api/audit-log/activity/`` endpoint).
  Default ``enabled = True`` to preserve the just-shipped behaviour;
  the flag exists so an operator who wants to hide the feed (e.g. for
  a strict-privacy deployment) can do it without a code change.

``get_or_create`` keeps the migration idempotent — re-running ``migrate``
after the flag has been flipped in production does not reset it. The
reverse migration is a deliberate no-op so reverting the migration
never silently flips a flag off in environments that depend on it.
"""
from django.db import migrations


SEED_FLAGS = [
    {
        'key': 'ui_system',
        'label': 'UI System',
        'description': (
            'Controls the visibility of the /ui-system developer '
            'reference page (live style guide of the shared UI '
            'components). When disabled, the nav entry is hidden and '
            'visiting the URL renders an empty state. Default off — '
            'this surface is for engineers, not nursery staff.'
        ),
        'enabled': False,
    },
    {
        'key': 'activity_logs',
        'label': 'Activity logs',
        'description': (
            'Controls the visibility of the /admin/activity '
            'cross-entity audit feed. When disabled, the nav entry is '
            'hidden, the page renders an empty state, and the '
            'GET /api/audit-log/activity/ endpoint returns 404. The '
            'underlying simple_history rows continue to be recorded; '
            'flipping the flag back on restores the feed without data '
            'loss.'
        ),
        'enabled': True,
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
        ('feature_flags', '0004_seed_notifications'),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]
