import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='TranscriptConfig',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('type', models.CharField(
                    choices=[
                        ('TRANSCRIPT_PROMPT', 'Transcript Prompt (Step 2b)'),
                        ('TRANSLATE_PROMPT', 'Translate Prompt (Step 3)'),
                    ],
                    max_length=50,
                    unique=True,
                )),
                ('value', models.TextField(help_text='System prompt gửi lên Gemini')),
                ('model', models.CharField(
                    choices=[
                        ('gemini-2.5-flash', 'Gemini 2.5 Flash'),
                        ('gemini-2.0-flash', 'Gemini 2.0 Flash'),
                        ('gemini-2.5-pro', 'Gemini 2.5 Pro'),
                    ],
                    default='gemini-2.5-flash',
                    max_length=100,
                )),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Transcript Config',
                'verbose_name_plural': 'Transcript Configs',
            },
        ),
        migrations.CreateModel(
            name='TranscriptJob',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('uuid', models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ('youtube_url', models.URLField(max_length=500)),
                ('playlist_url', models.URLField(blank=True, default='', max_length=500)),
                ('title', models.CharField(blank=True, default='', max_length=500)),
                ('audio_file', models.CharField(blank=True, default='', max_length=500)),
                ('step1_status', models.CharField(
                    choices=[
                        ('PENDING', 'Pending'),
                        ('PROCESSING', 'Processing'),
                        ('UPLOADING', 'Uploading'),
                        ('TRANSCRIBING', 'Transcribing'),
                        ('TRANSLATING', 'Translating'),
                        ('DONE', 'Done'),
                        ('FAILED', 'Failed'),
                        ('SKIPPED', 'Skipped'),
                    ],
                    default='PENDING',
                    max_length=20,
                )),
                ('step1_error', models.TextField(blank=True, default='')),
                ('gemini_file_uri', models.CharField(blank=True, default='', max_length=500)),
                ('gemini_file_name', models.CharField(blank=True, default='', max_length=200)),
                ('gemini_uploaded_at', models.DateTimeField(blank=True, null=True)),
                ('step2a_status', models.CharField(
                    choices=[
                        ('PENDING', 'Pending'),
                        ('PROCESSING', 'Processing'),
                        ('UPLOADING', 'Uploading'),
                        ('TRANSCRIBING', 'Transcribing'),
                        ('TRANSLATING', 'Translating'),
                        ('DONE', 'Done'),
                        ('FAILED', 'Failed'),
                        ('SKIPPED', 'Skipped'),
                    ],
                    default='PENDING',
                    max_length=20,
                )),
                ('step2a_error', models.TextField(blank=True, default='')),
                ('raw_transcript', models.TextField(blank=True, default='')),
                ('step2b_status', models.CharField(
                    choices=[
                        ('PENDING', 'Pending'),
                        ('PROCESSING', 'Processing'),
                        ('UPLOADING', 'Uploading'),
                        ('TRANSCRIBING', 'Transcribing'),
                        ('TRANSLATING', 'Translating'),
                        ('DONE', 'Done'),
                        ('FAILED', 'Failed'),
                        ('SKIPPED', 'Skipped'),
                    ],
                    default='PENDING',
                    max_length=20,
                )),
                ('step2b_error', models.TextField(blank=True, default='')),
                ('translated_transcript', models.TextField(blank=True, default='')),
                ('step3_status', models.CharField(
                    choices=[
                        ('PENDING', 'Pending'),
                        ('PROCESSING', 'Processing'),
                        ('UPLOADING', 'Uploading'),
                        ('TRANSCRIBING', 'Transcribing'),
                        ('TRANSLATING', 'Translating'),
                        ('DONE', 'Done'),
                        ('FAILED', 'Failed'),
                        ('SKIPPED', 'Skipped'),
                    ],
                    default='PENDING',
                    max_length=20,
                )),
                ('step3_error', models.TextField(blank=True, default='')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Transcript Job',
                'verbose_name_plural': 'Transcript Jobs',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='transcriptjob',
            index=models.Index(fields=['uuid'], name='idx_transcriptjob_uuid'),
        ),
        migrations.AddIndex(
            model_name='transcriptjob',
            index=models.Index(fields=['step1_status'], name='idx_transcriptjob_step1'),
        ),
        migrations.AddIndex(
            model_name='transcriptjob',
            index=models.Index(fields=['-created_at'], name='idx_transcriptjob_created'),
        ),
    ]
