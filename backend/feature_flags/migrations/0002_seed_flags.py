"""Seed the canonical feature flags.

Flags are the single source of truth for which toggles exist in the
product; this migration is where new ones are added. `get_or_create`
never clobbers an existing row's `enabled` value, so re-running migrate
after a flag has been flipped in production stays idempotent.

Removing a flag is deliberately NOT automated — it would silently flip a
feature off in environments that haven't pulled the new code yet. Delete
the relevant DB row manually (or via Django admin) once every consumer
has stopped calling the flag.
"""
from django.db import migrations


SEED_FLAGS = [
    {
        'key': 'multiday_schedule',
        'label': 'Multi-day schedule',
        'description': (
            'When enabled, schedules may span multiple days (the Schedule '
            'form shows a separate end-date input). When disabled, every '
            'schedule is a single-day stay and the end date is forced to '
            'match the start date.'
        ),
        'enabled': True,
    },
    {
        'key': 'custom_pet_species',
        'label': 'Custom pet species',
        'description': (
            'When enabled, the Pet form shows a free-text species input '
            'next to the default dropdown so staff can record exotic or '
            'rare species (reptiles, pigs, etc.) without a code change. '
            'When disabled, only the canonical dropdown (dog / cat / bird '
            '/ rabbit / other) is available.'
        ),
        'enabled': False,
    },
    {
        'key': 'vet_management',
        'label': 'Vet management',
        'description': (
            'Controls the visibility of the Vets page, the vet dropdowns '
            'in the Owner form (primary vet, emergency vet), and the vet '
            'override in the Pet form. The backend endpoints remain '
            'reachable when disabled so existing FK data is preserved.'
        ),
        'enabled': True,
    },
    {
        'key': 'medical_notes',
        'label': 'Medical notes',
        'description': (
            'When enabled, the Pet form includes the Medical Notes section '
            'for recording allergies, behavioral notes, and follow-ups. '
            'When disabled, the section is hidden but existing records '
            'remain in the database.'
        ),
        'enabled': True,
    },
    {
        'key': 'data_backup',
        'label': 'Data backup',
        'description': (
            'Controls the visibility of the Data Backup card in Settings '
            '(export to JSON / CSV and import from file). Disabling this '
            'flag only hides the UI; the /api/data-portability endpoints '
            'stay available for automation.'
        ),
        'enabled': True,
    },
    {
        'key': 'compatibility_warnings',
        'label': 'Compatibility warnings',
        'description': (
            'When enabled, the Schedule form surfaces pet-compatibility '
            'warnings (e.g. aggressive pet overlapping with another pet) '
            'after creation. When disabled, schedules are still created '
            'with overlap data but the warning banner is suppressed.'
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
    # Intentionally a no-op. Reversing the migration must not flip
    # features off in environments that still reference the keys.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('feature_flags', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]
