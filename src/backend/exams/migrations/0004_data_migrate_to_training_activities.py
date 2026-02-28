"""
Data migration M5: Migrate existing Flashcard/Exam records into TrainingSet/TrainingActivity.

- VideoLesson and PracticeModule sources only (BookChapter support is new — no existing data).
- Only PRACTICE exams are migrated; FINAL_EXAM keeps activity=None.
- Multiple PRACTICE exams per source: first (pk-ordered) is migrated, extras are deactivated.
- Transaction: Django auto-wraps each migration in atomic() — safe rollback if anything fails.
- No side effects outside DB (no file/S3 calls).

Rollback: migrate exams 0003 — all TrainingSet/TrainingActivity records dropped; legacy
lesson/module columns on Flashcard/Exam remain intact until Phase 3 cleanup.
"""
import warnings

from django.db import migrations


def migrate_to_training_activities(apps, schema_editor):
    TrainingSet = apps.get_model('exams', 'TrainingSet')
    TrainingActivity = apps.get_model('exams', 'TrainingActivity')
    Flashcard = apps.get_model('exams', 'Flashcard')
    Exam = apps.get_model('exams', 'Exam')
    VideoLesson = apps.get_model('videos', 'VideoLesson')
    PracticeModule = apps.get_model('exams', 'PracticeModule')

    # --- Pre-migration assertion ---
    dirty = Flashcard.objects.filter(
        lesson__isnull=False, module__isnull=False
    ).count()
    if dirty > 0:
        raise Exception(
            f"[M5] {dirty} Flashcard(s) have both lesson and module set. "
            "Clean up this data before running the migration."
        )

    def process_source(ts, source_filter):
        """Create TrainingActivity records and re-assign content for a given TrainingSet."""
        flashcards = Flashcard.objects.filter(**source_filter)
        practice_exams = Exam.objects.filter(
            exam_type='PRACTICE', **source_filter
        ).order_by('pk')

        if flashcards.exists():
            fa = TrainingActivity.objects.create(
                training_set=ts,
                activity_type='FLASHCARD',
                title='Ôn luyện thẻ nhớ',
                order=0,
            )
            flashcards.update(activity=fa)

        if practice_exams.exists():
            qa = TrainingActivity.objects.create(
                training_set=ts,
                activity_type='QUIZ',
                title='Kiểm tra kiến thức',
                order=1,
            )
            exams_list = list(practice_exams)
            exams_list[0].activity = qa
            exams_list[0].save(update_fields=['activity'])

            if len(exams_list) > 1:
                extra_ids = [e.pk for e in exams_list[1:]]
                Exam.objects.filter(pk__in=extra_ids).update(is_active=False)
                warnings.warn(
                    f"[M5] Deactivated {len(extra_ids)} extra PRACTICE exam(s): {extra_ids}. "
                    "Review these manually after migration.",
                    stacklevel=2,
                )

    # --- VideoLesson sources ---
    lesson_ids = set(
        list(
            Flashcard.objects.filter(lesson__isnull=False)
            .values_list('lesson_id', flat=True)
        )
        + list(
            Exam.objects.filter(lesson__isnull=False, exam_type='PRACTICE')
            .values_list('lesson_id', flat=True)
        )
    )
    for lesson_id in lesson_ids:
        lesson = VideoLesson.objects.get(pk=lesson_id)
        ts = TrainingSet.objects.create(title=lesson.title, lesson=lesson)
        process_source(ts, {'lesson_id': lesson_id})

    # --- PracticeModule sources ---
    module_ids = set(
        list(
            Flashcard.objects.filter(module__isnull=False)
            .values_list('module_id', flat=True)
        )
        + list(
            Exam.objects.filter(module__isnull=False, exam_type='PRACTICE')
            .values_list('module_id', flat=True)
        )
    )
    for module_id in module_ids:
        module = PracticeModule.objects.get(pk=module_id)
        ts = TrainingSet.objects.create(title=module.title, module=module)
        process_source(ts, {'module_id': module_id})


def reverse_migrate(apps, schema_editor):
    """Rollback: clear activity FKs and delete all TrainingSet/TrainingActivity records."""
    TrainingSet = apps.get_model('exams', 'TrainingSet')
    Flashcard = apps.get_model('exams', 'Flashcard')
    Exam = apps.get_model('exams', 'Exam')
    Flashcard.objects.filter(activity__isnull=False).update(activity=None)
    Exam.objects.filter(activity__isnull=False).update(activity=None)
    # TrainingActivity records cascade-deleted when TrainingSet is deleted
    TrainingSet.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('exams', '0003_add_training_set_activity_and_update_flashcard_exam'),
        ('videos', '0005_alter_videolesson_thumbnail'),
    ]

    operations = [
        migrations.RunPython(
            migrate_to_training_activities,
            reverse_code=reverse_migrate,
        ),
    ]
