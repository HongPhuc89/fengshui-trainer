from django import forms
from django.contrib import admin
from django.core.files.base import ContentFile
from django.shortcuts import get_object_or_404, redirect
from django.urls import path, reverse
from django.utils.html import format_html

from exams.models import Exam as ExamModel, Flashcard as FlashcardModel
from .models import VideoCategory, VideoCourse, VideoLesson, UserVideoPurchase, UserLessonProgress
from .storage import get_video_storage



@admin.register(VideoCategory)
class VideoCategoryAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug')
    prepopulated_fields = {'slug': ('title',)}


class VideoLessonInline(admin.TabularInline):
    model = VideoLesson
    extra = 0
    ordering = ('order',)
    fields = ('order', 'title', 'slug', 'is_free', 'duration_seconds', 'flashcard_count_display', 'has_exam_display')
    readonly_fields = ('flashcard_count_display', 'has_exam_display')
    show_change_link = True

    def flashcard_count_display(self, obj):
        if not obj.pk:
            return "—"
        c = obj.flashcards.count()
        return f"{c} thẻ" if c else "—"
    flashcard_count_display.short_description = "Flashcards"

    def has_exam_display(self, obj):
        if not obj.pk:
            return "—"
        return "✅" if obj.exams.filter(exam_type='PRACTICE').exists() else "—"
    has_exam_display.short_description = "Ôn luyện"


@admin.register(VideoCourse)
class VideoCourseAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'category', 'price_lt', 'level', 'total_lessons', 'published_date')
    list_filter = ('is_free', 'level', 'category')
    search_fields = ('title', 'instructor')
    prepopulated_fields = {'slug': ('title',)}
    inlines = [VideoLessonInline]


# ── VideoLesson admin with file upload + flashcard/exam inlines ───────────────

class VideoLessonAdminForm(forms.ModelForm):
    video_upload = forms.FileField(
        required=False,
        label='Upload video lên Bunny',
        help_text='Chấp nhận: mp4, mov, mkv, avi, webm — tối đa 5 GB. '
                  'File được upload trực tiếp từ trình duyệt lên Bunny Stream (có thanh tiến trình).',
        widget=forms.FileInput(attrs={
            'accept': 'video/mp4,video/quicktime,video/x-matroska,video/x-msvideo,video/webm',
        }),
    )
    class Meta:
        model = VideoLesson
        fields = '__all__'


class LessonExamInline(admin.TabularInline):
    model = ExamModel
    fk_name = 'lesson'
    verbose_name = "Bài ôn luyện"
    verbose_name_plural = "Bài ôn luyện"
    extra = 0
    show_change_link = True
    fields = ('title', 'slug', 'exam_type', 'passing_score', 'time_limit_minutes')


class LessonFlashcardInline(admin.StackedInline):
    model = FlashcardModel
    fk_name = 'lesson'
    verbose_name = "Flashcard"
    verbose_name_plural = "Kho Flashcard"
    extra = 0
    show_change_link = True
    classes = ('collapse',)
    fields = ('order', 'category', 'front', 'back', 'difficulty')
    ordering = ('order',)


@admin.register(VideoLesson)
class VideoLessonAdmin(admin.ModelAdmin):
    form = VideoLessonAdminForm

    class Media:
        js = ('videos/js/upload_progress.js',)

    list_display = ('course', 'title', 'order', 'is_free', 'duration_seconds', 'flashcard_count', 'has_exam', 'video_status')
    list_filter  = ('is_free', 'course')
    search_fields = ('title', 'course__title')
    prepopulated_fields = {'slug': ('title',)}
    readonly_fields = ('video_id', 'video_url', 'video_status', 'fetch_metadata_btn', 'extract_thumbnail_btn')
    inlines = []
    change_form_template = 'admin/videos/videolesson/change_form.html'

    fieldsets = (
        (None, {
            'fields': ('course', 'title', 'slug', 'order', 'is_free'),
        }),
        ('Video', {
            'fields': ('video_upload', 'video_status', 'video_id', 'video_url', 'duration_seconds', 'fetch_metadata_btn', 'thumbnail', 'extract_thumbnail_btn'),
        }),
        ('Nội dung', {
            'fields': ('description', 'transcript', 'summary'),
            'classes': ('collapse',),
        }),
    )

    ALLOWED_CONTENT_TYPES = {
        'video/mp4',
        'video/quicktime',    # .mov
        'video/x-matroska',   # .mkv
        'video/x-msvideo',    # .avi
        'video/webm',
    }
    MAX_SIZE_BYTES = 5 * 1024 * 1024 * 1024  # 5 GB

    def flashcard_count(self, obj):
        c = obj.flashcards.count()
        return f"{c} thẻ" if c else "—"
    flashcard_count.short_description = "Kho Flashcard"

    def has_exam(self, obj):
        return "✅" if obj.exams.filter(exam_type='PRACTICE').exists() else "—"
    has_exam.short_description = "Ôn luyện"

    def video_status(self, obj):
        if obj.video_url:
            short = obj.video_url[:70] + ('…' if len(obj.video_url) > 70 else '')
            return format_html('<span style="color:#66bb6a">✓ URL: {}</span>', short)
        if obj.video_id:
            return format_html('<span style="color:#ffa726">✓ Local: {}</span>', obj.video_id)
        return format_html('<span style="color:#ef5350">✗ Chưa có video</span>')
    video_status.short_description = 'Trạng thái video'

    def fetch_metadata_btn(self, obj):
        if not obj.pk or not obj.video_id:
            return '—'
        url = reverse('admin:videos_videolesson_fetch_metadata', args=[obj.pk])
        return format_html(
            '<a class="button" href="{}" style="padding:6px 12px;background:#417690;color:#fff;'
            'border-radius:4px;text-decoration:none;font-size:13px">'
            'Cập nhật thời lượng từ video</a>',
            url,
        )
    fetch_metadata_btn.short_description = 'Thời lượng tự động'

    def extract_thumbnail_btn(self, obj):
        if not obj.pk or not obj.video_id:
            return '—'
        url = reverse('admin:videos_videolesson_extract_thumbnail', args=[obj.pk])
        return format_html(
            '<a class="button" href="{}" style="padding:6px 12px;background:#417690;color:#fff;'
            'border-radius:4px;text-decoration:none;font-size:13px">'
            'Lấy thumbnail từ video</a>',
            url,
        )
    extract_thumbnail_btn.short_description = 'Thumbnail tự động'

    def get_urls(self):
        urls = super().get_urls()
        custom = [
            path(
                '<int:pk>/fetch-metadata/',
                self.admin_site.admin_view(self.fetch_metadata_view),
                name='videos_videolesson_fetch_metadata',
            ),
            path(
                '<int:pk>/extract-thumbnail/',
                self.admin_site.admin_view(self.extract_thumbnail_view),
                name='videos_videolesson_extract_thumbnail',
            ),
            path(
                '<int:pk>/import-flashcards/',
                self.admin_site.admin_view(self.import_flashcards_view),
                name='videos_videolesson_import_flashcards',
            ),
            path(
                '<int:pk>/import-quiz/',
                self.admin_site.admin_view(self.import_quiz_view),
                name='videos_videolesson_import_quiz',
            ),
            path(
                'export-flashcards-template/',
                self.admin_site.admin_view(self.export_flashcards_template_view),
                name='videos_videolesson_export_flashcards_template',
            ),
            path(
                'export-quiz-template/',
                self.admin_site.admin_view(self.export_quiz_template_view),
                name='videos_videolesson_export_quiz_template',
            ),
        ]
        return custom + urls

    def fetch_metadata_view(self, request, pk):
        lesson = get_object_or_404(VideoLesson, pk=pk)
        if not lesson.video_id:
            self.message_user(request, 'Bài học chưa có video_id.', level='error')
        else:
            try:
                meta = get_video_storage().get_metadata(lesson.video_id)
                if meta.duration_seconds:
                    lesson.duration_seconds = meta.duration_seconds
                    lesson.save(update_fields=['duration_seconds'])
                    self.message_user(request, f'Đã cập nhật thời lượng: {meta.duration_seconds}s.')
                else:
                    self.message_user(request, 'Không lấy được thời lượng từ video.', level='warning')
            except Exception as exc:
                self.message_user(request, f'Lỗi khi lấy metadata: {exc}', level='error')
        return redirect(reverse('admin:videos_videolesson_change', args=[pk]))

    def extract_thumbnail_view(self, request, pk):
        lesson = get_object_or_404(VideoLesson, pk=pk)
        if not lesson.video_id:
            self.message_user(request, 'Bài học chưa có video_id.', level='error')
        else:
            try:
                data = get_video_storage().extract_thumbnail(lesson.video_id)
                if data:
                    filename = f'{lesson.video_id}.jpg'
                    lesson.thumbnail.save(filename, ContentFile(data), save=True)
                    self.message_user(request, 'Đã lấy thumbnail từ video thành công.')
                else:
                    self.message_user(request, 'Không thể lấy thumbnail từ video.', level='warning')
            except Exception as exc:
                self.message_user(request, f'Lỗi khi lấy thumbnail: {exc}', level='error')
        return redirect(reverse('admin:videos_videolesson_change', args=[pk]))

    def import_flashcards_view(self, request, pk):
        lesson = get_object_or_404(VideoLesson, pk=pk)
        if request.method == 'POST':
            from exams.utils import parse_flashcards_csv_for_activity, provision_training_activity
            csv_file = request.FILES.get('file')
            if not csv_file:
                self.message_user(request, 'Không tìm thấy file.', level='error')
            else:
                activity, _ = provision_training_activity('lesson', lesson, 'FLASHCARD')
                result = parse_flashcards_csv_for_activity(csv_file, activity)
                msg = f'Đã import {result["created"]} flashcard.'
                if result['skipped']:
                    msg += f' Bỏ qua {result["skipped"]} dòng.'
                self.message_user(request, msg, level='success' if result['created'] else 'warning')
                for err in result['errors'][:10]:
                    self.message_user(request, f'Dòng {err["row"]}: {err["error"]}', level='warning')
            return redirect(reverse('admin:videos_videolesson_change', args=[pk]))

        from django.template.response import TemplateResponse
        return TemplateResponse(request, 'admin/videos/videolesson/import_flashcards.html', {
            'lesson': lesson,
            'title': f'Import Flashcard — {lesson.title}',
            'opts': self.model._meta,
        })

    def import_quiz_view(self, request, pk):
        lesson = get_object_or_404(VideoLesson, pk=pk)
        if request.method == 'POST':
            from exams.utils import parse_questions_csv, provision_training_activity
            csv_file = request.FILES.get('file')
            if not csv_file:
                self.message_user(request, 'Không tìm thấy file.', level='error')
            else:
                _, exam = provision_training_activity('lesson', lesson, 'QUIZ')
                result = parse_questions_csv(csv_file, exam)
                msg = f'Đã import {result["created"]} câu hỏi.'
                if result['skipped']:
                    msg += f' Bỏ qua {result["skipped"]} dòng.'
                self.message_user(request, msg, level='success' if result['created'] else 'warning')
                for err in result['errors'][:10]:
                    self.message_user(request, f'Dòng {err["row"]}: {err["error"]}', level='warning')
            return redirect(reverse('admin:videos_videolesson_change', args=[pk]))

        from django.template.response import TemplateResponse
        return TemplateResponse(request, 'admin/videos/videolesson/import_quiz.html', {
            'lesson': lesson,
            'title': f'Import Quiz — {lesson.title}',
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
        extra_context['import_flashcards_url'] = reverse('admin:videos_videolesson_import_flashcards', args=[object_id])
        extra_context['import_quiz_url'] = reverse('admin:videos_videolesson_import_quiz', args=[object_id])
        extra_context['export_flashcards_template_url'] = reverse('admin:videos_videolesson_export_flashcards_template')
        extra_context['export_quiz_template_url'] = reverse('admin:videos_videolesson_export_quiz_template')
        return super().change_view(request, object_id, form_url, extra_context)

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        video_file = form.cleaned_data.get('video_upload')
        if video_file:
            try:
                result = get_video_storage().upload(video_file, video_file.name)
                obj.video_id  = result.video_id
                obj.video_url = result.video_url
                obj.save(update_fields=['video_id', 'video_url'])
            except Exception as exc:
                self.message_user(request, f'Upload video thất bại: {exc}', level='error')


@admin.register(UserVideoPurchase)
class UserVideoPurchaseAdmin(admin.ModelAdmin):
    list_display = ('user', 'video', 'created_at')
    list_filter = ('created_at',)


@admin.register(UserLessonProgress)
class UserLessonProgressAdmin(admin.ModelAdmin):
    list_display = ('user', 'lesson', 'progress_seconds', 'completed', 'last_watched')
