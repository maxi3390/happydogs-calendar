"""Seed the `deworming_tracking` feature flag.

When enabled, the Pet form exposes two date inputs for recording the
last internal (intestinal) and last external (flea/tick) deworming
treatments, and the Pet detail / list views surface them. Disabled by
default so the field is opt-in per nursery.

`get_or_create` keeps re-running this migration idempotent — once an
operator flips the flag on in production, subsequent migrate runs will
not reset it.
"""
from django.db import migrations


SEED_FLAGS = [
    {
        'key': 'deworming_tracking',
        'label': 'Deworming tracking',
        'description': (
            'When enabled, the Pet form shows date inputs for the last '
            'internal (intestinal) and external (flea/tick) deworming '
            'treatments, and the Pet detail / list views display them. '
            'Disabled by default — opt in per nursery.'
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
    # Intentionally a no-op — reversing must not flip the flag off
    # in environments that still call it.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('feature_flags', '0002_seed_flags'),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]
