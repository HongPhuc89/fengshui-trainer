from django.contrib import admin
from django.shortcuts import get_object_or_404, redirect
from django.urls import path, reverse
from django.utils.text import slugify
from .models import BookCategory, Book, BookChapter, UserBookPurchase


@admin.register(BookCategory)
class BookCategoryAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug')
    readonly_fields = ('slug',)

    def save_model(self, request, obj, form, change):
        obj.slug = slugify(obj.title)
        super().save_model(request, obj, form, change)


class BookChapterInline(admin.TabularInline):
    model = BookChapter
    extra = 0
    ordering = ('order',)


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'category', 'price_lt', 'is_free', 'is_new_release', 'published_date')
    list_filter = ('is_free', 'is_new_release', 'category')
    search_fields = ('title', 'author')
    readonly_fields = ('slug',)
    inlines = [BookChapterInline]

    def save_model(self, request, obj, form, change):
        obj.slug = slugify(obj.title)
        super().save_model(request, obj, form, change)


@admin.register(BookChapter)
class BookChapterAdmin(admin.ModelAdmin):
    list_display = ('book', 'title', 'order', 'is_demo')
    list_filter = ('is_demo',)
    search_fields = ('title', 'book__title')  # required for autocomplete_fields in TrainingSetAdmin
    raw_id_fields = ('book',)
    change_form_template = 'admin/books/bookchapter/change_form.html'

    def get_urls(self):
        urls = super().get_urls()
        custom = [
            path(
                '<int:pk>/import-flashcards/',
                self.admin_site.admin_view(self.import_flashcards_view),
                name='books_bookchapter_import_flashcards',
            ),
            path(
                '<int:pk>/import-quiz/',
                self.admin_site.admin_view(self.import_quiz_view),
                name='books_bookchapter_import_quiz',
            ),
            path(
                'export-flashcards-template/',
                self.admin_site.admin_view(self.export_flashcards_template_view),
                name='books_bookchapter_export_flashcards_template',
            ),
            path(
                'export-quiz-template/',
                self.admin_site.admin_view(self.export_quiz_template_view),
                name='books_bookchapter_export_quiz_template',
            ),
        ]
        return custom + urls

    def import_flashcards_view(self, request, pk):
        chapter = get_object_or_404(BookChapter, pk=pk)
        if request.method == 'POST':
            from exams.utils import parse_flashcards_csv_for_activity, provision_training_activity
            csv_file = request.FILES.get('file')
            if not csv_file:
                self.message_user(request, 'Không tìm thấy file.', level='error')
            else:
                activity, _ = provision_training_activity('chapter', chapter, 'FLASHCARD')
                result = parse_flashcards_csv_for_activity(csv_file, activity)
                msg = f'Đã import {result["created"]} flashcard.'
                if result['skipped']:
                    msg += f' Bỏ qua {result["skipped"]} dòng.'
                self.message_user(request, msg, level='success' if result['created'] else 'warning')
                for err in result['errors'][:10]:
                    self.message_user(request, f'Dòng {err["row"]}: {err["error"]}', level='warning')
            return redirect(reverse('admin:books_bookchapter_change', args=[pk]))

        from django.template.response import TemplateResponse
        return TemplateResponse(request, 'admin/books/bookchapter/import_flashcards.html', {
            'chapter': chapter,
            'title': f'Import Flashcard — {chapter.title}',
            'opts': self.model._meta,
        })

    def import_quiz_view(self, request, pk):
        chapter = get_object_or_404(BookChapter, pk=pk)
        if request.method == 'POST':
            from exams.utils import parse_questions_csv, provision_training_activity
            csv_file = request.FILES.get('file')
            if not csv_file:
                self.message_user(request, 'Không tìm thấy file.', level='error')
            else:
                _, exam = provision_training_activity('chapter', chapter, 'QUIZ')
                result = parse_questions_csv(csv_file, exam)
                msg = f'Đã import {result["created"]} câu hỏi.'
                if result['skipped']:
                    msg += f' Bỏ qua {result["skipped"]} dòng.'
                self.message_user(request, msg, level='success' if result['created'] else 'warning')
                for err in result['errors'][:10]:
                    self.message_user(request, f'Dòng {err["row"]}: {err["error"]}', level='warning')
            return redirect(reverse('admin:books_bookchapter_change', args=[pk]))

        from django.template.response import TemplateResponse
        return TemplateResponse(request, 'admin/books/bookchapter/import_quiz.html', {
            'chapter': chapter,
            'title': f'Import Quiz — {chapter.title}',
            'opts': self.model._meta,
        })

    def export_flashcards_template_view(self, request):
        from django.http import HttpResponse
        from exams.utils import FLASHCARDS_CSV_TEMPLATE
        response = HttpResponse(FLASHCARDS_CSV_TEMPLATE, content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="flashcards_template.csv"'
        return response

    def export_quiz_template_view(self, request):
        from django.http import HttpResponse
        from exams.utils import QUESTIONS_CSV_TEMPLATE
        response = HttpResponse(QUESTIONS_CSV_TEMPLATE, content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="quiz_template.csv"'
        return response

    def change_view(self, request, object_id, form_url='', extra_context=None):
        extra_context = extra_context or {}
        extra_context['import_flashcards_url'] = reverse('admin:books_bookchapter_import_flashcards', args=[object_id])
        extra_context['import_quiz_url'] = reverse('admin:books_bookchapter_import_quiz', args=[object_id])
        extra_context['export_flashcards_template_url'] = reverse('admin:books_bookchapter_export_flashcards_template')
        extra_context['export_quiz_template_url'] = reverse('admin:books_bookchapter_export_quiz_template')
        return super().change_view(request, object_id, form_url, extra_context)


@admin.register(UserBookPurchase)
class UserBookPurchaseAdmin(admin.ModelAdmin):
    list_display = ('user', 'book', 'pdf_ready', 'created_at')
    list_filter = ('created_at', 'pdf_ready')
    raw_id_fields = ('user', 'book')
