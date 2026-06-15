from django.db import migrations, models
import transcripts.models


class Migration(migrations.Migration):

    dependencies = [
        ('transcripts', '0009_update_transcript_prompt_v3'),
    ]

    operations = [
        migrations.AddField(
            model_name='transcriptjob',
            name='source_type',
            field=models.CharField(
                choices=[('YOUTUBE', 'YouTube URL'), ('LOCAL_AUDIO', 'Local Audio Upload')],
                default='YOUTUBE',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='transcriptjob',
            name='uploaded_audio',
            field=models.FileField(
                blank=True,
                null=True,
                upload_to=transcripts.models._upload_to_temp,
                help_text='Upload an audio file (MP3/WAV/M4A, max 100 MB)',
            ),
        ),
        migrations.AlterField(
            model_name='transcriptjob',
            name='youtube_url',
            field=models.URLField(blank=True, default='', max_length=500),
        ),
    ]
