import uuid

from django.db import migrations, models


def seed_singleton(apps, schema_editor):
    """
    Create the one AppRelease row this feature is built around (feature-37
    §3.1, §4). Uses the historical model via `apps`, not the live import from
    core.models — importing the current model directly is the classic
    migration footgun once the model changes again in a later migration.
    """
    AppRelease = apps.get_model('core', 'AppRelease')
    AppRelease.objects.create(platform='ANDROID')


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='AppRelease',
            fields=[
                ('id', models.BigAutoField(primary_key=True, serialize=False)),
                ('public_id', models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('platform', models.CharField(choices=[('ANDROID', 'Android')], default='ANDROID',
                                               max_length=10, unique=True)),
                ('version_code', models.PositiveIntegerField(default=0, editable=False)),
                ('version_name', models.CharField(default='0.0.0', editable=False, max_length=32)),
                ('file', models.FileField(blank=True, null=True, upload_to='releases/')),
                ('file_size', models.BigIntegerField(default=0, editable=False)),
                ('sha256', models.CharField(blank=True, editable=False, max_length=64)),
                ('release_notes', models.TextField(blank=True)),
            ],
            options={
                'verbose_name': 'App Release',
                'verbose_name_plural': 'App Releases',
            },
        ),
        migrations.RunPython(seed_singleton, migrations.RunPython.noop),
    ]
