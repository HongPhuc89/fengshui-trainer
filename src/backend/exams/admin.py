from django.contrib import admin
from django.shortcuts import get_object_or_404, redirect
from django.urls import path, reverse
from django.utils.html import format_html

from .models import PracticeModule, Exam, PracticeQuestion, UserExamProgress, Flashcard, FlashcardReview


@admin.register(PracticeModule)
class PracticeModuleAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'order')
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
    list_display = ('front_preview', 'category', 'lesson_link', 'module', 'difficulty', 'order')
    list_filter = ('difficulty',)
    list_editable = ('order', 'category', 'difficulty')
    search_fields = ('front', 'back', 'category', 'lesson__title')
    ordering = ('lesson', 'order')

    def front_preview(self, obj):
        return (obj.front[:60] + '...') if len(obj.front) > 60 else obj.front
    front_preview.short_description = "Mặt trước"

    def lesson_link(self, obj):
        if obj.lesson:
            url = reverse('admin:videos_videolesson_change', args=[obj.lesson.pk])
            return format_html('<a href="{}">{}</a>', url, obj.lesson.title)
        return "—"
    lesson_link.short_description = "Bài học"


@admin.register(FlashcardReview)
class FlashcardReviewAdmin(admin.ModelAdmin):
    list_display = ('user', 'flashcard', 'next_review', 'interval', 'repetitions')
    raw_id_fields = ('user', 'flashcard')
