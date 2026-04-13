# Generated manually — add logo field to NurserySetting

import django.core.validators
from django.db import migrations, models
import domain.files.validators


class Migration(migrations.Migration):

    dependencies = [
        ('nursery_settings', '0001_add_nurserysetting'),
    ]

    operations = [
        migrations.AddField(
            model_name='nurserysetting',
            name='logo',
            field=models.ImageField(
                blank=True,
                help_text='System logo (JPEG, PNG, GIF, WEBP — max 5 MB)',
                null=True,
                upload_to='logos/',
                validators=[domain.files.validators.validate_file_size, domain.files.validators.validate_image_type],
            ),
        ),
    ]
