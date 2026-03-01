from django.contrib import admin
from django.shortcuts import get_object_or_404, redirect
from django.urls import path, reverse
from django.utils.html import format_html

from .models import (
    PracticeModule, Exam, PracticeQuestion, UserExamProgress,
    Flashcard, FlashcardReview, TrainingSet, TrainingActivity,
)


@admin.register(PracticeModule)
class PracticeModuleAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'order')
    search_fields = ('title', 'slug')  # required for autocomplete_fields in TrainingSetAdmin
    prepopulated_fields = {'slug': ('title',)}


class PracticeQuestionInline(admin.StackedInline):
    model = PracticeQuestion
    extra = 0
    fields = ('order', 'question_type', 'question_text', 'options',
              'correct_answer', 'explanation', 'points', 'difficulty')
    ordering = ('order',)
    classes = ('collapse',)


@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    list_display = ('title', 'lesson_link', 'exam_type', 'question_count', 'passing_score')
    list_filter = ('exam_type',)
    search_fields = ('title', 'lesson__title', 'slug')
    autocomplete_fields = ('lesson',)
    prepopulated_fields = {'slug': ('title',)}
    inlines = [PracticeQuestionInline]

    def lesson_link(self, obj):
        if obj.lesson:
            url = reverse('admin:videos_videolesson_change', args=[obj.lesson.pk])
            return format_html('<a href="{}">{}</a>', url, obj.lesson.title)
        return "—"
    lesson_link.short_description = "Bài học"

    def question_count(self, obj):
        return obj.questions.count()
    question_count.short_description = "Số câu"

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


@admin.register(UserExamProgress)
class UserExamProgressAdmin(admin.ModelAdmin):
    list_display = ('user', 'exam', 'score', 'is_passed', 'attempts', 'last_attempt')
    list_filter = ('is_passed', 'exam')
    search_fields = ('user__username', 'exam__title')
    raw_id_fields = ('user', 'exam')
    readonly_fields = ('score', 'attempts', 'last_attempt', 'answers_snapshot')


@admin.register(Flashcard)
class FlashcardAdmin(admin.ModelAdmin):
    list_display  = ('front_preview', 'category', 'lesson_link', 'module', 'difficulty', 'order')
    list_filter   = ('difficulty',)
    list_editable = ('order', 'category', 'difficulty')
    search_fields = ('front', 'back', 'category', 'lesson__title')
    ordering      = ('lesson', 'order')

    def front_preview(self, obj):
        return (obj.front[:60] + '...') if len(obj.front) > 60 else obj.front
    front_preview.short_description = "Front"

    def lesson_link(self, obj):
        if obj.lesson:
            url = reverse('admin:videos_videolesson_change', args=[obj.lesson.pk])
            return format_html('<a href="{}">{}</a>', url, obj.lesson.title)
        return "—"
    lesson_link.short_description = "Lesson"


@admin.register(FlashcardReview)
class FlashcardReviewAdmin(admin.ModelAdmin):
    list_display = ('user', 'flashcard', 'next_review', 'interval', 'repetitions')
    raw_id_fields = ('user', 'flashcard')


# ---------------------------------------------------------------------------
# Training admin (§6.3)
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
        # prefetch activities to avoid N+1 in activity_summary (§T5)
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
