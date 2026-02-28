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
    list_display  = ('front_preview', 'category', 'lesson_link', 'module', 'difficulty', 'order')
    list_filter   = ('difficulty',)
    list_editable = ('order', 'category', 'difficulty')
    search_fields = ('front', 'back', 'category', 'lesson__title')
    ordering      = ('lesson', 'order')
    change_list_template = 'admin/exams/flashcard/change_list.html'

    def front_preview(self, obj):
        return (obj.front[:60] + '...') if len(obj.front) > 60 else obj.front
    front_preview.short_description = "Front"

    def lesson_link(self, obj):
        if obj.lesson:
            url = reverse('admin:videos_videolesson_change', args=[obj.lesson.pk])
            return format_html('<a href="{}">{}</a>', url, obj.lesson.title)
        return "—"
    lesson_link.short_description = "Lesson"

    def get_urls(self):
        urls = super().get_urls()
        custom = [
            path(
                'import-flashcards/',
                self.admin_site.admin_view(self.import_flashcards_view),
                name='flashcard_import',
            ),
            path(
                'export-flashcards-template/',
                self.admin_site.admin_view(self.export_flashcards_template_view),
                name='flashcard_export_template',
            ),
        ]
        return custom + urls

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        extra_context['import_url']           = reverse('admin:flashcard_import')
        extra_context['export_template_url']  = reverse('admin:flashcard_export_template')
        return super().changelist_view(request, extra_context)

    def import_flashcards_view(self, request):
        from django.template.response import TemplateResponse
        from videos.models import VideoLesson
        from .utils import parse_flashcards_csv

        lessons = VideoLesson.objects.select_related('course').order_by('course__title', 'order')
        modules = PracticeModule.objects.order_by('order', 'title')

        if request.method == 'POST':
            csv_file    = request.FILES.get('file')
            lesson_id   = request.POST.get('lesson_id') or None
            module_id   = request.POST.get('module_id') or None

            if not csv_file:
                self.message_user(request, 'No file selected.', level='error')
            elif not lesson_id and not module_id:
                self.message_user(request, 'Select a lesson or a module to assign the flashcards to.', level='error')
            else:
                lesson = VideoLesson.objects.get(pk=lesson_id) if lesson_id else None
                module = PracticeModule.objects.get(pk=module_id) if module_id else None
                result = parse_flashcards_csv(csv_file, lesson=lesson, module=module)
                msg = f'Imported {result["created"]} flashcard(s).'
                if result['skipped']:
                    msg += f' Skipped {result["skipped"]} row(s).'
                self.message_user(request, msg, level='success' if result['created'] else 'warning')
                for err in result['errors'][:10]:
                    self.message_user(request, f'Row {err["row"]}: {err["error"]}', level='warning')
                return redirect(reverse('admin:exams_flashcard_changelist'))

        return TemplateResponse(request, 'admin/exams/flashcard/import_flashcards.html', {
            'title':              'Import Flashcards from CSV',
            'opts':               self.model._meta,
            'lessons':            lessons,
            'modules':            modules,
            'export_template_url': reverse('admin:flashcard_export_template'),
        })

    def export_flashcards_template_view(self, request):
        from django.http import HttpResponse
        from .utils import FLASHCARDS_CSV_TEMPLATE
        response = HttpResponse(FLASHCARDS_CSV_TEMPLATE, content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="flashcards_template.csv"'
        return response


@admin.register(FlashcardReview)
class FlashcardReviewAdmin(admin.ModelAdmin):
    list_display = ('user', 'flashcard', 'next_review', 'interval', 'repetitions')
    raw_id_fields = ('user', 'flashcard')
