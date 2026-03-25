from django.contrib import admin
from django.db import transaction
from django.db.models import Max
from django.shortcuts import get_object_or_404, redirect
from django.urls import path, reverse
from django.utils.html import format_html
from django.utils.text import slugify
from .models import BookCategory, Book, BookChapter, UserBookPurchase, UserChapterProgress


class UserBookPurchaseInline(admin.TabularInline):
    model = UserBookPurchase
    extra = 0
    fields = ('user', 'pdf_ready', 'created_at')
    readonly_fields = ('pdf_ready', 'created_at')
    raw_id_fields = ('user',)
    can_delete = False
    verbose_name = 'Người dùng sở hữu'
    verbose_name_plural = 'Người dùng sở hữu'

    def has_add_permission(self, request, obj=None):
        return False


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
    exclude = ('slug', 'file_size', 'page_count', 'encrypted_cdn_url', 'encryption_version')
    can_delete = False

    def get_formset(self, request, obj=None, **kwargs):
        formset = super().get_formset(request, obj, **kwargs)
        if obj is not None:
            next_order = (obj.chapters.aggregate(max_order=Max('order'))['max_order'] or 0) + 1
            formset.form.base_fields['order'].initial = next_order
        return formset


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'category', 'price_lt', 'is_free', 'is_new_release', 'published_date', 'reader_progress_link')
    list_filter = ('is_free', 'is_new_release', 'category')
    search_fields = ('title', 'author')
    readonly_fields = ('slug',)
    inlines = [BookChapterInline, UserBookPurchaseInline]
    change_form_template = 'admin/books/book/change_form.html'

    @staticmethod
    def _get_client_ip(request):
        xff = request.META.get('HTTP_X_FORWARDED_FOR')
        if xff:
            return xff.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')

    def reader_progress_link(self, obj):
        url = reverse('admin:books_userchapterprogress_changelist') + f'?chapter__book__id__exact={obj.pk}'
        return format_html('<a href="{}">Xem tiến độ</a>', url)
    reader_progress_link.short_description = 'Tiến độ đọc'

    def get_urls(self):
        urls = super().get_urls()
        custom = [
            path(
                '<int:pk>/grant-access/',
                self.admin_site.admin_view(self.grant_access_view),
                name='books_book_grant_access',
            ),
        ]
        return custom + urls

    def grant_access_view(self, request, pk):
        from users.models import User, AdminAuditLog

        book = get_object_or_404(Book, pk=pk)

        if request.method != 'POST':
            return redirect(reverse('admin:books_book_change', args=[pk]))

        user_id = request.POST.get('user_id')
        if not user_id:
            self.message_user(request, 'Vui lòng nhập ID người dùng.', level='error')
            return redirect(reverse('admin:books_book_change', args=[pk]))

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            self.message_user(request, 'Không tìm thấy người dùng.', level='error')
            return redirect(reverse('admin:books_book_change', args=[pk]))

        if UserBookPurchase.objects.filter(user=user, book=book).exists():
            self.message_user(request, f'Người dùng "{user}" đã sở hữu sách "{book.title}".', level='error')
            return redirect(reverse('admin:books_book_change', args=[pk]))

        with transaction.atomic():
            UserBookPurchase.objects.create(user=user, book=book)
            AdminAuditLog.objects.create(
                staff=request.user,
                target_user=user,
                action_category='CONTENT_GRANT',
                action_detail=f'Admin kích hoạt sách "{book.title}" cho "{user}"',
                change_log={'book_id': str(book.public_id), 'book_title': book.title},
                ip_address=self._get_client_ip(request),
            )
            try:
                from notifications.models import Notification
                Notification.objects.create(
                    user=user,
                    title='Sách đã được kích hoạt',
                    body=f'Sách "{book.title}" đã được kích hoạt trong tài khoản của bạn. Chúc bạn học tốt! 📖',
                    notification_type='PURCHASE',
                    related_object_type='book',
                    related_object_id=str(book.public_id),
                )
            except Exception:
                pass

        self.message_user(request, f'✅ Đã kích hoạt sách "{book.title}" cho {user}.')
        return redirect(reverse('admin:books_book_change', args=[pk]))

    def change_view(self, request, object_id, form_url='', extra_context=None):
        extra_context = extra_context or {}
        pk = int(object_id)
        prev_obj = Book.objects.filter(pk__lt=pk).order_by('-pk').values('pk').first()
        next_obj = Book.objects.filter(pk__gt=pk).order_by('pk').values('pk').first()
        if prev_obj:
            extra_context['prev_url'] = reverse('admin:books_book_change', args=[prev_obj['pk']])
        if next_obj:
            extra_context['next_url'] = reverse('admin:books_book_change', args=[next_obj['pk']])
        extra_context['grant_access_url'] = reverse('admin:books_book_grant_access', args=[pk])
        return super().change_view(request, object_id, form_url, extra_context)

    def save_model(self, request, obj, form, change):
        obj.slug = slugify(obj.title)
        super().save_model(request, obj, form, change)

    def save_formset(self, request, form, formset, change):
        instances = formset.save(commit=False)
        for obj in instances:
            if not obj.slug:
                obj.slug = slugify(obj.title)
            obj.save()
        formset.save_m2m()


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


@admin.register(UserChapterProgress)
class UserChapterProgressAdmin(admin.ModelAdmin):
    list_display = ('user_link', 'book_title', 'chapter_title', 'current_page', 'completed', 'last_read')
    list_filter = ('completed', ('chapter__book', admin.RelatedFieldListFilter))
    search_fields = ('user__username', 'user__phone_number', 'chapter__title', 'chapter__book__title')
    date_hierarchy = 'last_read'
    raw_id_fields = ('user', 'chapter')
    ordering = ('-last_read',)
    show_full_result_count = False

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'chapter', 'chapter__book')

    def user_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.user_id])
        return format_html('<a href="{}">{}</a>', url, obj.user.username)
    user_link.short_description = 'User'
    user_link.admin_order_field = 'user__username'

    def book_title(self, obj):
        url = reverse('admin:books_book_change', args=[obj.chapter.book_id])
        return format_html('<a href="{}">{}</a>', url, obj.chapter.book.title)
    book_title.short_description = 'Sách'
    book_title.admin_order_field = 'chapter__book__title'

    def chapter_title(self, obj):
        return f"#{obj.chapter.order} {obj.chapter.title}"
    chapter_title.short_description = 'Chương'
    chapter_title.admin_order_field = 'chapter__order'
