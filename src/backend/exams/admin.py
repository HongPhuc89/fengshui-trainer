from django.contrib import admin
from django.db.models import Count
from django.shortcuts import get_object_or_404, redirect
from django.urls import path, reverse
from django.utils.html import format_html

from .forms import PracticeQuestionForm
from .models import (
    Exam, Flashcard, FlashcardReview, PracticeModule,
    PracticeQuestion, TrainingActivity, TrainingSet, UserExamProgress,
)


# ---------------------------------------------------------------------------
# PracticeModule
# ---------------------------------------------------------------------------

@admin.register(PracticeModule)
class PracticeModuleAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'order')
    search_fields = ('title', 'slug')  # required for autocomplete_fields in TrainingSetAdmin
    prepopulated_fields = {'slug': ('title',)}


# ---------------------------------------------------------------------------
# Helpers shared by ExamAdmin and PracticeQuestionAdmin
# ---------------------------------------------------------------------------

class DifficultyFilter(admin.SimpleListFilter):
    """Fixed-choice filter for difficulty CharField (avoids showing raw DB values)."""

    title = "Độ khó"
    parameter_name = "difficulty"

    def lookups(self, request, model_admin):
        return [
            ('EASY', 'Dễ'),
            ('MEDIUM', 'Trung bình'),
            ('HARD', 'Khó'),
            ('', 'Chưa phân loại'),
        ]

    def queryset(self, request, queryset):
        # self.value() is None when "All" is selected, "" when "Chưa phân loại"
        if self.value() is not None:
            return queryset.filter(difficulty=self.value())
        return queryset


# ---------------------------------------------------------------------------
# PracticeQuestion — inline (lightweight, no options/correct_answer editing)
# ---------------------------------------------------------------------------

class PracticeQuestionInline(admin.TabularInline):
    """Compact inline for Exam change page.

    Intentionally excludes `options` and `correct_answer` fields — those are
    edited on the dedicated PracticeQuestionAdmin change page (show_change_link).
    This avoids OptionsWidget layout conflicts inside a TabularInline.
    """

    model = PracticeQuestion
    extra = 0
    fields = ('order', 'question_type', 'question_preview_text', 'difficulty', 'points')
    readonly_fields = ('question_preview_text',)
    show_change_link = True
    ordering = ('order',)

    def question_preview_text(self, obj):
        return (obj.question_text[:60] + '…') if len(obj.question_text) > 60 else obj.question_text
    question_preview_text.short_description = "Câu hỏi"


# ---------------------------------------------------------------------------
# PracticeQuestion — standalone admin (the main new screen)
# ---------------------------------------------------------------------------

@admin.register(PracticeQuestion)
class PracticeQuestionAdmin(admin.ModelAdmin):
    """Standalone admin to browse/edit questions across all exams.

    Key design decisions:
    - select_related across 5 paths to eliminate N+1 on list page.
    - DifficultyFilter avoids raw DB value pollution.
    - list_display_links only on question_preview (source_link contains <a> tags).
    - form uses PracticeQuestionForm with OptionsWidget + HiddenInput for correct_answer.
    """

    form = PracticeQuestionForm
    list_display = (
        'question_preview', 'exam_link', 'source_link',
        'question_type', 'difficulty', 'points', 'order',
    )
    list_display_links = ('question_preview',)
    list_filter = (
        'question_type',
        DifficultyFilter,
        'exam__exam_type',
        'exam__activity__training_set__lesson__course',
        'exam__activity__training_set__chapter__book',
    )
    search_fields = (
        'question_text',
        'exam__title',
        'exam__activity__training_set__lesson__title',
        'exam__activity__training_set__chapter__title',
    )
    list_per_page = 50
    ordering = ('exam', 'order')

    def get_queryset(self, request):
        return (
            super().get_queryset(request)
            .select_related(
                'exam',                                              # exam_link needs exam.title
                'exam__activity__training_set__lesson',             # source_link needs lesson.title
                'exam__activity__training_set__lesson__course',     # filter by Course
                'exam__activity__training_set__chapter',            # source_link needs chapter.title
                'exam__activity__training_set__chapter__book',      # filter by Book
            )
        )

    def question_preview(self, obj):
        text = obj.question_text
        return (text[:80] + '…') if len(text) > 80 else text
    question_preview.short_description = "Câu hỏi"

    def exam_link(self, obj):
        url = reverse('admin:exams_exam_change', args=[obj.exam_id])
        return format_html('<a href="{}">{}</a>', url, obj.exam.title)
    exam_link.short_description = "Bộ Quiz"

    def source_link(self, obj):
        """Resolve source via TrainingActivity → TrainingSet → lesson/chapter.

        Legacy exams (activity_id=None) return "—" safely.
        """
        if not obj.exam.activity_id:
            return "—"
        ts = obj.exam.activity.training_set
        if ts.lesson_id:
            url = reverse('admin:videos_videolesson_change', args=[ts.lesson_id])
            return format_html('<a href="{}">[Video] {}</a>', url, ts.lesson.title)
        if ts.chapter_id:
            url = reverse('admin:books_bookchapter_change', args=[ts.chapter_id])
            return format_html('<a href="{}">[Sách] {}</a>', url, ts.chapter.title)
        return "—"
    source_link.short_description = "Nguồn"


# ---------------------------------------------------------------------------
# Exam actions
# ---------------------------------------------------------------------------

@admin.action(description="Nhân bản Exam đã chọn")
def duplicate_exam(modeladmin, request, queryset):
    """Clone selected exams + all their questions.

    S3 fix: slug collision handled — appends incrementing suffix.
    C1 fix: exam.activity set to None before save to avoid OneToOne IntegrityError.
    The cloned exam has activity=None and won't appear in frontend Training flow
    until an admin manually assigns a TrainingActivity.
    """
    count = queryset.count()  # capture before loop to avoid re-evaluation

    for exam in queryset.prefetch_related('questions'):
        questions = list(exam.questions.all())

        # --- S3: slug collision fix ---
        base_slug = exam.slug + '-copy'
        candidate = base_slug
        counter = 1
        while Exam.objects.filter(slug=candidate).exists():
            candidate = f"{base_slug}-{counter}"
            counter += 1

        exam.pk = None
        exam.uuid = None
        exam.slug = candidate
        exam.title = exam.title + ' (Copy)'
        exam.activity = None  # C1 fix: prevent IntegrityError on OneToOneField
        exam.save()

        for q in questions:
            q.pk = None
            q.uuid = None
            q.exam = exam
            q.save()

    modeladmin.message_user(
        request,
        f"Đã nhân bản {count} exam. "
        "Exam mới chưa gắn TrainingActivity — cần gắn thủ công trước khi publish.",
    )


# ---------------------------------------------------------------------------
# Exam
# ---------------------------------------------------------------------------

@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    list_display = ('title', 'source_link', 'exam_type', 'question_count_badge', 'passing_score')
    list_display_links = ('title',)
    list_filter = (
        'exam_type',
        'activity__training_set__lesson__course',
        'activity__training_set__chapter__book',
    )
    search_fields = (
        'title', 'slug',
        'lesson__title',
        'activity__training_set__lesson__title',
        'activity__training_set__chapter__title',
    )
    autocomplete_fields = ('lesson',)
    prepopulated_fields = {'slug': ('title',)}
    inlines = [PracticeQuestionInline]
    actions = [duplicate_exam]

    def get_queryset(self, request):
        return (
            super().get_queryset(request)
            .select_related(
                'lesson',
                'activity__training_set__lesson',
                'activity__training_set__chapter',
            )
            .annotate(_question_count=Count('questions'))
        )

    def source_link(self, obj):
        # New path: activity → training_set → lesson/chapter
        if obj.activity_id:
            ts = obj.activity.training_set
            if ts.lesson_id:
                url = reverse('admin:videos_videolesson_change', args=[ts.lesson_id])
                return format_html('<a href="{}">[Video] {}</a>', url, ts.lesson.title)
            if ts.chapter_id:
                url = reverse('admin:books_bookchapter_change', args=[ts.chapter_id])
                return format_html('<a href="{}">[Sách] {}</a>', url, ts.chapter.title)
        # Legacy path
        if obj.lesson_id:
            url = reverse('admin:videos_videolesson_change', args=[obj.lesson_id])
            return format_html('<a href="{}">{}</a>', url, obj.lesson.title)
        return "—"
    source_link.short_description = "Nguồn"

    def question_count_badge(self, obj):
        count = obj._question_count
        if count == 0:
            return format_html(
                '<span style="color:#c0392b;font-weight:700">{} câu</span>', count
            )
        return format_html(
            '<span style="color:#27ae60;font-weight:600">{} câu</span>', count
        )
    question_count_badge.short_description = "Số câu"
    question_count_badge.admin_order_field = '_question_count'

    def get_urls(self):
        urls = super().get_urls()
        custom = [
            path(
                '<int:pk>/import-questions/',
                self.admin_site.admin_view(self.import_questions_view),
                name='exam_import_questions',
            ),
            path(
                'export-questions-template/',
                self.admin_site.admin_view(self.export_questions_template_view),
                name='exam_export_questions_template',
            ),
        ]
        return custom + urls

    def import_questions_view(self, request, pk):
        exam = get_object_or_404(Exam, pk=pk)
        if request.method == 'POST':
            from .utils import parse_questions_csv
            csv_file = request.FILES.get('file')
            if not csv_file:
                self.message_user(request, 'Không tìm thấy file.', level='error')
            else:
                result = parse_questions_csv(csv_file, exam)
                msg = f'Đã import {result["created"]} câu hỏi.'
                if result['skipped']:
                    msg += f' Bỏ qua {result["skipped"]} dòng.'
                self.message_user(request, msg, level='success' if result['created'] else 'warning')
                for err in result['errors'][:10]:
                    self.message_user(request, f'Dòng {err["row"]}: {err["error"]}', level='warning')
            return redirect(reverse('admin:exams_exam_change', args=[pk]))

        from django.template.response import TemplateResponse
        return TemplateResponse(request, 'admin/exams/exam/import_questions.html', {
            'exam': exam,
            'title': f'Import câu hỏi — {exam.title}',
            'opts': self.model._meta,
        })

    def export_questions_template_view(self, request):
        from django.http import HttpResponse
        from .utils import QUESTIONS_CSV_TEMPLATE
        response = HttpResponse(QUESTIONS_CSV_TEMPLATE, content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="questions_template.csv"'
        return response

    def change_view(self, request, object_id, form_url='', extra_context=None):
        extra_context = extra_context or {}
        extra_context['import_url'] = reverse('admin:exam_import_questions', args=[object_id])
        extra_context['export_template_url'] = reverse('admin:exam_export_questions_template')
        return super().change_view(request, object_id, form_url, extra_context)


# ---------------------------------------------------------------------------
# UserExamProgress
# ---------------------------------------------------------------------------

@admin.register(UserExamProgress)
class UserExamProgressAdmin(admin.ModelAdmin):
    list_display = ('user', 'exam', 'score', 'is_passed', 'attempts', 'last_attempt')
    list_filter = ('is_passed', 'exam')
    search_fields = ('user__username', 'exam__title')
    raw_id_fields = ('user', 'exam')
    readonly_fields = ('score', 'attempts', 'last_attempt', 'answers_snapshot')


# ---------------------------------------------------------------------------
# Flashcard
# ---------------------------------------------------------------------------

@admin.register(Flashcard)
class FlashcardAdmin(admin.ModelAdmin):
    list_display  = ('front_preview', 'category', 'source_link', 'difficulty', 'order')
    list_filter   = (
        'difficulty',
        'activity__training_set__lesson__course',
        'activity__training_set__chapter__book',
        'lesson__course',
    )
    list_editable = ('order', 'category', 'difficulty')
    search_fields = (
        'front', 'back', 'category',
        'lesson__title',
        'activity__training_set__lesson__title',
        'activity__training_set__chapter__title',
    )
    ordering = ('activity', 'lesson', 'order')

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'lesson', 'module',
            'activity__training_set__lesson',
            'activity__training_set__chapter',
        )

    def front_preview(self, obj):
        return (obj.front[:60] + '...') if len(obj.front) > 60 else obj.front
    front_preview.short_description = "Front"

    def source_link(self, obj):
        # New path: activity → training_set → lesson/chapter
        if obj.activity_id:
            ts = obj.activity.training_set
            if ts.lesson_id:
                url = reverse('admin:videos_videolesson_change', args=[ts.lesson_id])
                return format_html('<a href="{}">[Video] {}</a>', url, ts.lesson.title)
            if ts.chapter_id:
                url = reverse('admin:books_bookchapter_change', args=[ts.chapter_id])
                return format_html('<a href="{}">[Sách] {}</a>', url, ts.chapter.title)
        # Legacy path
        if obj.lesson_id:
            url = reverse('admin:videos_videolesson_change', args=[obj.lesson_id])
            return format_html('<a href="{}">{}</a>', url, obj.lesson.title)
        if obj.module_id:
            return str(obj.module)
        return "—"
    source_link.short_description = "Nguồn"


# ---------------------------------------------------------------------------
# FlashcardReview
# ---------------------------------------------------------------------------

@admin.register(FlashcardReview)
class FlashcardReviewAdmin(admin.ModelAdmin):
    list_display = ('user', 'flashcard', 'next_review', 'interval', 'repetitions')
    raw_id_fields = ('user', 'flashcard')


# ---------------------------------------------------------------------------
# Training admin
# ---------------------------------------------------------------------------

class TrainingActivityInline(admin.TabularInline):
    model = TrainingActivity
    extra = 0
    fields = ['activity_type', 'title', 'order', 'is_active', 'public_id']
    readonly_fields = ['public_id']  # shown for copy-paste into import API
    ordering = ['order']


@admin.register(TrainingSet)
class TrainingSetAdmin(admin.ModelAdmin):
    list_display = ['title', 'source_type', 'get_source_name', 'activity_summary']
    list_filter = ['lesson__course', 'chapter__book']
    search_fields = ['title']
    autocomplete_fields = ['lesson', 'chapter', 'module']
    inlines = [TrainingActivityInline]

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related('activities')

    def get_source_name(self, obj):
        return obj.lesson or obj.chapter or obj.module
    get_source_name.short_description = 'Source'

    def activity_summary(self, obj):
        parts = [
            f"{'✓' if a.is_active else '✗'} {a.activity_type}"
            for a in obj.activities.all()
        ]
        return ' | '.join(parts) or '—'
    activity_summary.short_description = 'Activities'


@admin.register(TrainingActivity)
class TrainingActivityAdmin(admin.ModelAdmin):
    list_display = ['title', 'training_set', 'activity_type', 'order', 'is_active', 'public_id']
    list_filter = ['activity_type', 'is_active']
    search_fields = ['title', 'training_set__title']
    readonly_fields = ['public_id']
    autocomplete_fields = ['training_set']

    def get_urls(self):
        urls = super().get_urls()
        custom = [
            path(
                '<int:pk>/import-flashcards/',
                self.admin_site.admin_view(self.import_flashcards_view),
                name='trainingactivity_import_flashcards',
            ),
        ]
        return custom + urls

    def import_flashcards_view(self, request, pk):
        activity = get_object_or_404(TrainingActivity, pk=pk)
        if request.method == 'POST':
            from .utils import parse_flashcards_csv_for_activity
            csv_file = request.FILES.get('file')
            if not csv_file:
                self.message_user(request, 'Không tìm thấy file.', level='error')
            else:
                result = parse_flashcards_csv_for_activity(csv_file, activity)
                msg = f'Đã import {result["created"]} flashcard(s).'
                if result['skipped']:
                    msg += f' Bỏ qua {result["skipped"]} dòng.'
                self.message_user(request, msg, level='success' if result['created'] else 'warning')
                for err in result['errors'][:10]:
                    self.message_user(request, f'Dòng {err["row"]}: {err["error"]}', level='warning')
            return redirect(reverse('admin:exams_trainingactivity_change', args=[pk]))

        from django.template.response import TemplateResponse
        return TemplateResponse(request, 'admin/exams/flashcard/import_flashcards.html', {
            'activity': activity,
            'title': f'Import Flashcards — {activity.title}',
            'opts': self.model._meta,
        })

    def change_view(self, request, object_id, form_url='', extra_context=None):
        extra_context = extra_context or {}
        obj = self.get_object(request, object_id)
        if obj and obj.activity_type == TrainingActivity.ActivityType.FLASHCARD:
            extra_context['import_url'] = reverse(
                'admin:trainingactivity_import_flashcards', args=[object_id]
            )
        return super().change_view(request, object_id, form_url, extra_context)
