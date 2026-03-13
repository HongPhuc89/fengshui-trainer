# Generated for Feature 17: Admin Activity Dashboard — add index for DAU queries.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('videos', '0005_alter_videolesson_thumbnail'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='userlessonprogress',
            index=models.Index(fields=['last_watched'], name='ulp_last_watched_idx'),
        ),
    ]
