# Generated for Feature 17: Admin Activity Dashboard — add index for DAU queries.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('books', '0008_alter_bookchapter_file_path'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='userchapterprogress',
            index=models.Index(fields=['last_read'], name='ucp_last_read_idx'),
        ),
    ]
