from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.conf import settings
from django.utils.functional import cached_property

from users.models import BaseModel


class TrainingSet(BaseModel):
    """Groups flashcards and quizzes for a single content source (lesson, chapter, or module).

    Exactly one of lesson / chapter / module must be non-null (enforced by CheckConstraint + clean()).
    source_type is a @cached_property derived from which FK is set — never stored in DB.
    """

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    lesson = models.OneToOneField(
        'videos.VideoLesson',
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='training_set',
    )
    chapter = models.OneToOneField(
        'books.BookChapter',
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='training_set',
    )
    module = models.ForeignKey(
        'PracticeModule',
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='training_sets',
    )

    class Meta:
        verbose_name = "Training Set"
        verbose_name_plural = "Training Sets"
        ordering = ['title']
        constraints = [
            models.CheckConstraint(
                check=(
                    Q(lesson_id__isnull=False, chapter_id__isnull=True, module_id__isnull=True)
                    | Q(lesson_id__isnull=True, chapter_id__isnull=False, module_id__isnull=True)
                    | Q(lesson_id__isnull=True, chapter_id__isnull=True, module_id__isnull=False)
                ),
                name='trainingset_exactly_one_source',
            )
        ]

    def clean(self):
        sources = [bool(self.lesson_id), bool(self.chapter_id), bool(self.module_id)]
        if sources.count(True) != 1:
            raise ValidationError("TrainingSet phải gắn với đúng 1 source (lesson, chapter, hoặc module).")

    @cached_property
    def source_type(self):
        if self.lesson_id:
            return 'LESSON'
        if self.chapter_id:
            return 'CHAPTER'
        return 'STANDALONE'

    @cached_property
    def source_meta(self):
        """Thông tin source cho frontend fallback navigation."""
        if self.lesson_id:
            return {
                'lesson_slug': self.lesson.slug,
                'course_slug': self.lesson.course.slug,
            }
        if self.chapter_id:
            return {
                'book_slug': self.chapter.book.slug,
                'chapter_order': self.chapter.order,
            }
        return {'module_slug': self.module.slug}

    def __str__(self):
        return self.title


class TrainingActivity(BaseModel):
    """One learning mode (FLASHCARD, QUIZ, …) within a TrainingSet.

    Extensibility rule:
      - Thêm value vào ActivityType
      - Tạo content model mới với FK/OneToOne trỏ vào TrainingActivity
      - KHÔNG thay đổi TrainingSet, Flashcard, Exam, hay migration cũ
    """

    class ActivityType(models.TextChoices):
        FLASHCARD = 'FLASHCARD', 'Flashcard Deck'
        QUIZ = 'QUIZ', 'Quiz / Exam'
        # v2: MINDMAP = 'MINDMAP', 'Mind Map'
        # v2: INFOGRAPHIC = 'INFOGRAPHIC', 'Infographic'

    training_set = models.ForeignKey(
        TrainingSet,
        on_delete=models.CASCADE,
        related_name='activities',
    )
    activity_type = models.CharField(max_length=20, choices=ActivityType.choices)
    title = models.CharField(max_length=255)
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Training Activity"
        verbose_name_plural = "Training Activities"
        ordering = ['order']
        constraints = [
            models.UniqueConstraint(
                fields=['training_set', 'activity_type'],
                name='exams_trainingactivity_unique_type_per_set',
            )
        ]

    def __str__(self):
        return f"{self.training_set} — {self.activity_type}"


class PracticeModule(BaseModel):
    """Tower / practice focus - groups exams."""
    title = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, max_length=255)
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Practice Module"
        verbose_name_plural = "Practice Modules"
        ordering = ['order', 'title']

    def __str__(self):
        return self.title


class Exam(BaseModel):
    """Exam (final, practice, quiz).

    PRACTICE exam → activity (OneToOne to TrainingActivity type=QUIZ).
    FINAL_EXAM → activity=None (linked directly from Book.final_exam_id / Course.final_exam_id).
    """
    EXAM_TYPE_CHOICES = [
        ('FINAL_EXAM', 'Final Exam'),
        ('PRACTICE', 'Practice'),
        ('QUIZ', 'Quiz'),
    ]

    activity = models.OneToOneField(
        TrainingActivity,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='exam',
    )
    # Legacy FKs — kept until Phase 3 cleanup migration
    module = models.ForeignKey(
        PracticeModule,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='exams',
    )
    lesson = models.ForeignKey(
        'videos.VideoLesson',
        on_delete=models.CASCADE,
        related_name='exams',
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, max_length=255)
    description = models.TextField(blank=True)
    time_limit_minutes = models.PositiveIntegerField(null=True, blank=True)
    passing_score = models.PositiveIntegerField(default=70, help_text="Score %% to pass")
    exam_type = models.CharField(max_length=20, choices=EXAM_TYPE_CHOICES, default='PRACTICE')

    class Meta:
        verbose_name = "Exam"
        verbose_name_plural = "Exams"
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class PracticeQuestion(BaseModel):
    """Question belonging to an exam."""
    QUESTION_TYPE_CHOICES = [
        ('MULTIPLE_CHOICE', 'Trắc nghiệm nhiều lựa chọn'),
        ('YES_NO', 'Có / Không'),
        ('TRUE_FALSE', 'Đúng / Sai'),
    ]

    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='questions')
    question_type = models.CharField(
        max_length=20,
        choices=QUESTION_TYPE_CHOICES,
        default='MULTIPLE_CHOICE',
    )
    question_text = models.TextField()
    options = models.JSONField(default=list)  # [{"id": "a", "text": "..."}, ...]
    correct_answer = models.CharField(max_length=50)  # id of correct option
    explanation = models.TextField(blank=True)
    difficulty = models.CharField(max_length=10, blank=True)  # EASY, MEDIUM, HARD
    points = models.PositiveIntegerField(default=10)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Practice Question"
        verbose_name_plural = "Practice Questions"
        ordering = ['exam', 'order']

    def __str__(self):
        return (self.question_text[:50] + '...') if len(self.question_text) > 50 else self.question_text


class UserExamProgress(BaseModel):
    """User's progress on an exam."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='exam_progresses',
    )
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='user_progresses')
    score = models.PositiveIntegerField(default=0)
    is_passed = models.BooleanField(default=False)
    attempts = models.PositiveIntegerField(default=0)
    last_attempt = models.DateTimeField(auto_now=True)
    answers_snapshot = models.JSONField(null=True, blank=True)

    class Meta:
        verbose_name = "User Exam Progress"
        verbose_name_plural = "User Exam Progresses"
        constraints = [
            models.UniqueConstraint(fields=['user', 'exam'], name='exams_userexamprogress_unique_user_exam'),
        ]
        ordering = ['-last_attempt']

    def __str__(self):
        return f"{self.user} - {self.exam}: {self.score}%"


class Flashcard(BaseModel):
    """Flashcard for spaced repetition.

    Phase 1-2: activity is nullable (migration period — lesson/module still present).
    Phase 3: activity becomes NOT NULL after data migration verified.
    """
    activity = models.ForeignKey(
        TrainingActivity,
        on_delete=models.CASCADE,
        related_name='flashcards',
        null=True,
        blank=True,
    )
    # Legacy FKs — kept until Phase 3 cleanup migration
    module = models.ForeignKey(
        PracticeModule,
        on_delete=models.CASCADE,
        related_name='flashcards',
        null=True,
        blank=True,
    )
    lesson = models.ForeignKey(
        'videos.VideoLesson',
        on_delete=models.CASCADE,
        related_name='flashcards',
        null=True,
        blank=True,
    )
    front = models.TextField()
    back = models.TextField()
    category = models.CharField(
        max_length=100,
        blank=True,
        help_text="Nhãn hiển thị trên thẻ, vd: KHÁI NIỆM CỐT LÕI",
    )
    image = models.URLField(max_length=500, blank=True)  # S3/CDN URL — không phải file upload
    difficulty = models.CharField(max_length=10, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Flashcard"
        verbose_name_plural = "Flashcards"
        ordering = ['order']

    def clean(self):
        # Phase 1-2: accept activity OR legacy lesson/module
        if not self.activity_id and not self.lesson_id and not self.module_id:
            raise ValidationError(
                "Flashcard phải thuộc một TrainingActivity, VideoLesson, hoặc PracticeModule."
            )

    def __str__(self):
        return (self.front[:40] + '...') if len(self.front) > 40 else self.front


class FlashcardReview(BaseModel):
    """SM-2 spaced repetition state per user per flashcard."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='flashcard_reviews',
    )
    flashcard = models.ForeignKey(Flashcard, on_delete=models.CASCADE, related_name='reviews')
    next_review = models.DateTimeField(null=True, blank=True)
    interval = models.PositiveIntegerField(default=0)  # days
    ease_factor = models.FloatField(default=2.5)
    repetitions = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Flashcard Review"
        verbose_name_plural = "Flashcard Reviews"
        constraints = [
            models.UniqueConstraint(fields=['user', 'flashcard'], name='exams_flashcardreview_unique_user_flashcard'),
        ]

    def __str__(self):
        return f"{self.user} - {self.flashcard} (next: {self.next_review})"
