from django.db import migrations, models


def copy_address_to_street(apps, schema_editor):
    """Preserve existing free-form address text by copying it into the new `street` field (truncated to 255 chars)."""
    Owner = apps.get_model('pets', 'Owner')
    for owner in Owner.objects.exclude(address='').exclude(address__isnull=True):
        if owner.address:
            owner.street = owner.address[:255]
            owner.save(update_fields=['street'])


def reverse_noop(apps, schema_editor):
    """Rollback does not reconstruct the legacy `address` text field.

    On rollback, the new columns are dropped by the AddField reversal and
    the legacy `address` column is re-added empty by the RemoveField
    reversal — the original text is lost from the DB. Restore from backup
    if rollback is ever needed.
    """
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('pets', '0010_medicalnote'),
    ]

    operations = [
        migrations.AddField(
            model_name='owner',
            name='street',
            field=models.CharField(
                blank=True,
                default='',
                help_text='Street address line (building number + street name + unit)',
                max_length=255,
            ),
        ),
        migrations.AddField(
            model_name='owner',
            name='city',
            field=models.CharField(blank=True, default='', help_text='Ciudad', max_length=100),
        ),
        migrations.AddField(
            model_name='owner',
            name='state',
            field=models.CharField(blank=True, default='', help_text='Localidad', max_length=100),
        ),
        migrations.AddField(
            model_name='owner',
            name='province',
            field=models.CharField(blank=True, default='', help_text='Provincia', max_length=100),
        ),
        migrations.AddField(
            model_name='owner',
            name='country',
            field=models.CharField(blank=True, default='', help_text='País', max_length=100),
        ),
        migrations.RunPython(copy_address_to_street, reverse_noop),
        migrations.RemoveField(
            model_name='owner',
            name='address',
        ),
    ]
