from django import forms
from django.contrib import admin
from django.core.files.base import ContentFile
from django.db import transaction
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect
from django.urls import path, reverse
from django.utils.html import format_html
from django.utils.text import slugify

from exams.models import Exam as ExamModel, Flashcard as FlashcardModel
from .models import VideoCategory, VideoCourse, VideoLesson, UserVideoPurchase, UserLessonProgress
from .storage import get_video_storage



class UserVideoPurchaseInline(admin.TabularInline):
    model = UserVideoPurchase
    extra = 0
    fields = ('user', 'created_at')
    readonly_fields = ('created_at',)
    raw_id_fields = ('user',)
    can_delete = False
    verbose_name = 'Người dùng sở hữu'
    verbose_name_plural = 'Người dùng sở hữu'

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(VideoCategory)
class VideoCategoryAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug')
    prepopulated_fields = {'slug': ('title',)}


class VideoLessonInline(admin.TabularInline):
    model = VideoLesson
    extra = 0
    ordering = ('order',)
    fields = ('order', 'title', 'is_free', 'duration_seconds', 'flashcard_count_display', 'has_exam_display')
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
    list_display = ('title', 'slug', 'category', 'price_lt', 'level', 'total_lessons', 'published_date', 'learner_progress_link')
    list_filter = ('is_free', 'level', 'category')
    search_fields = ('title', 'instructor')
    inlines = [VideoLessonInline, UserVideoPurchaseInline]
    readonly_fields = ('recalculate_totals_btn',)
    change_form_template = 'admin/videos/videocourse/change_form.html'

    class Media:
        js = ('videos/js/auto_slug_course.js',)

    @staticmethod
    def _get_client_ip(request):
        xff = request.META.get('HTTP_X_FORWARDED_FOR')
        if xff:
            return xff.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')

    def recalculate_totals_btn(self, obj):
        if not obj or not obj.pk:
            return '—'
        url = reverse('admin:videos_videocourse_recalculate_totals', args=[obj.pk])
        return format_html(
            '<a href="{}" class="button" '
            'style="padding:6px 14px;background:#417690;color:#fff;border-radius:4px;'
            'text-decoration:none;font-size:13px;display:inline-block">'
            '⟳ Tính lại tổng duration &amp; số video</a>'
            '<span style="margin-left:10px;color:#888;font-size:12px">'
            'Hiện tại: {} video — {} giây</span>',
            url,
            obj.total_lessons,
            obj.total_duration_seconds,
        )
    recalculate_totals_btn.short_description = 'Tính lại tổng'

    def learner_progress_link(self, obj):
        url = reverse('admin:videos_userlessonprogress_changelist') + f'?lesson__course__id__exact={obj.pk}'
        return format_html('<a href="{}">Xem tiến độ</a>', url)
    learner_progress_link.short_description = 'Tiến độ học viên'

    def get_urls(self):
        urls = super().get_urls()
        custom = [
            path(
                '<int:pk>/recalculate-totals/',
                self.admin_site.admin_view(self.recalculate_totals_view),
                name='videos_videocourse_recalculate_totals',
            ),
            path(
                '<int:pk>/grant-access/',
                self.admin_site.admin_view(self.grant_access_view),
                name='videos_videocourse_grant_access',
            ),
        ]
        return custom + urls

    def grant_access_view(self, request, pk):
        from users.models import User, AdminAuditLog

        video = get_object_or_404(VideoCourse, pk=pk)

        if request.method != 'POST':
            return redirect(reverse('admin:videos_videocourse_change', args=[pk]))

        user_id = request.POST.get('user_id')
        if not user_id:
            self.message_user(request, 'Vui lòng nhập ID người dùng.', level='error')
            return redirect(reverse('admin:videos_videocourse_change', args=[pk]))

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            self.message_user(request, 'Không tìm thấy người dùng.', level='error')
            return redirect(reverse('admin:videos_videocourse_change', args=[pk]))

        if UserVideoPurchase.objects.filter(user=user, video=video).exists():
            self.message_user(request, f'Người dùng "{user}" đã sở hữu khoá học "{video.title}".', level='error')
            return redirect(reverse('admin:videos_videocourse_change', args=[pk]))

        with transaction.atomic():
            UserVideoPurchase.objects.create(user=user, video=video)
            AdminAuditLog.objects.create(
                staff=request.user,
                target_user=user,
                action_category='CONTENT',
                action_detail=f'Admin kích hoạt khoá học "{video.title}" cho "{user}"',
                change_log={'video_id': str(video.public_id), 'video_title': video.title},
                ip_address=self._get_client_ip(request),
            )
            try:
                from notifications.models import Notification
                Notification.objects.create(
                    user=user,
                    title='Khoá học đã được kích hoạt',
                    body=f'Khoá học "{video.title}" đã được kích hoạt trong tài khoản của bạn. Chúc bạn học tốt! 🎬',
                    notification_type='PURCHASE',
                    related_object_type='videocourse',
                    related_object_id=str(video.public_id),
                )
            except Exception:
                pass

        self.message_user(request, f'✅ Đã kích hoạt khoá học "{video.title}" cho {user}.')
        return redirect(reverse('admin:videos_videocourse_change', args=[pk]))

    def recalculate_totals_view(self, request, pk):
        course = get_object_or_404(VideoCourse, pk=pk)
        old_lessons = course.total_lessons
        old_duration = course.total_duration_seconds
        course.recalculate_totals()
        self.message_user(
            request,
            f'Đã cập nhật: {old_lessons} → {course.total_lessons} video, '
            f'{old_duration}s → {course.total_duration_seconds}s tổng thời lượng.',
        )
        return redirect(reverse('admin:videos_videocourse_change', args=[pk]))

    def save_model(self, request, obj, form, change):
        if not obj.slug:
            base = slugify(obj.title, allow_unicode=False) or 'course'
            slug = base
            n = 1
            while VideoCourse.objects.filter(slug=slug).exclude(pk=obj.pk).exists():
                slug = f'{base}-{n}'
                n += 1
            obj.slug = slug
        super().save_model(request, obj, form, change)

    def save_formset(self, request, form, formset, change):
        instances = formset.save(commit=False)
        for obj in instances:
            if isinstance(obj, VideoLesson) and not obj.slug:
                base = slugify(obj.title, allow_unicode=False) or 'lesson'
                slug = base
                n = 1
                while VideoLesson.objects.filter(course=obj.course, slug=slug).exclude(pk=obj.pk).exists():
                    slug = f'{base}-{n}'
                    n += 1
                obj.slug = slug
            obj.save()
        for obj in formset.deleted_objects:
            obj.delete()
        formset.save_m2m()

    def change_view(self, request, object_id, form_url='', extra_context=None):
        extra_context = extra_context or {}
        pk = int(object_id)
        extra_context['grant_access_url'] = reverse('admin:videos_videocourse_grant_access', args=[pk])
        return super().change_view(request, object_id, form_url, extra_context)


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
    infographic_pdf_upload = forms.FileField(
        required=False,
        label='Upload lược đồ PDF',
        help_text='Chấp nhận: PDF — tối đa 50 MB. Ghi đè file cũ nếu đã có.',
        widget=forms.FileInput(attrs={'accept': 'application/pdf'}),
    )
    def clean_infographic_pdf_upload(self):
        pdf_file = self.cleaned_data.get('infographic_pdf_upload')
        if pdf_file:
            max_size = 50 * 1024 * 1024  # 50 MB
            if pdf_file.size > max_size:
                raise forms.ValidationError('File PDF vượt quá giới hạn 50 MB.')
        return pdf_file

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
        js = ('videos/js/upload_progress.js', 'videos/js/auto_slug_course.js')

    list_display = ('course', 'title', 'order', 'is_free', 'duration_seconds', 'flashcard_count', 'has_exam', 'video_status')
    list_filter  = ('is_free', 'course')
    search_fields = ('title', 'course__title')
    readonly_fields = ('video_id', 'video_url', 'video_status', 'fetch_metadata_btn', 'extract_thumbnail_btn', 'infographic_pdf_status')
    inlines = []
    change_form_template = 'admin/videos/videolesson/change_form.html'

    fieldsets = (
        (None, {
            'fields': ('course', 'title', 'slug', 'order', 'is_free'),
        }),
        ('Video', {
            'fields': ('video_upload', 'video_status', 'video_id', 'video_url', 'duration_seconds', 'fetch_metadata_btn', 'thumbnail', 'extract_thumbnail_btn'),
        }),
        ('Lược đồ PDF', {
            'fields': ('infographic_pdf_upload', 'infographic_pdf_status', 'infographic_pdf_key'),
            'description': 'Upload PDF lên Bunny Storage. Ghi đè file cũ nếu đã có. Tối đa 50 MB.',
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

    def infographic_pdf_status(self, obj):
        if not obj.pk or not obj.infographic_pdf_key:
            return format_html('<span style="color:#ef5350">Chưa có lược đồ PDF</span>')
        return format_html(
            '<span style="color:#66bb6a">Key: {}</span>',
            obj.infographic_pdf_key,
        )
    infographic_pdf_status.short_description = 'Trạng thái lược đồ PDF'

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
            '<button type="button" data-ajax-url="{}" '
            'style="padding:6px 12px;background:#417690;color:#fff;border:none;'
            'border-radius:4px;cursor:pointer;font-size:13px" '
            'onclick="adminAjaxBtn(this)">'
            'Lấy thời lượng từ Bunny</button>',
            url,
        )
    fetch_metadata_btn.short_description = 'Thời lượng tự động'

    def extract_thumbnail_btn(self, obj):
        if not obj.pk or not obj.video_id:
            return '—'
        url = reverse('admin:videos_videolesson_extract_thumbnail', args=[obj.pk])
        return format_html(
            '<button type="button" data-ajax-url="{}" '
            'style="padding:6px 12px;background:#417690;color:#fff;border:none;'
            'border-radius:4px;cursor:pointer;font-size:13px" '
            'onclick="adminAjaxBtn(this)">'
            'Lấy thumbnail từ Bunny</button>',
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
            path(
                '<int:pk>/import-quiz-notebooklm/',
                self.admin_site.admin_view(self.import_quiz_notebooklm_view),
                name='videos_videolesson_import_quiz_notebooklm',
            ),
        ]
        return custom + urls

    def fetch_metadata_view(self, request, pk):
        lesson = get_object_or_404(VideoLesson, pk=pk)
        is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
        if not lesson.video_id:
            msg = 'Bài học chưa có video_id.'
            if is_ajax:
                return JsonResponse({'ok': False, 'msg': msg}, status=400)
            self.message_user(request, msg, level='error')
            return redirect(reverse('admin:videos_videolesson_change', args=[pk]))
        try:
            meta = get_video_storage().get_metadata(lesson.video_id)
            if meta.duration_seconds:
                lesson.duration_seconds = meta.duration_seconds
                lesson.save(update_fields=['duration_seconds'])
                if lesson.course_id:
                    lesson.course.recalculate_totals()
                msg = f'Đã cập nhật thời lượng: {meta.duration_seconds}s.'
                if is_ajax:
                    return JsonResponse({'ok': True, 'msg': msg, 'duration_seconds': meta.duration_seconds})
            else:
                msg = 'Không lấy được thời lượng từ video.'
                if is_ajax:
                    return JsonResponse({'ok': False, 'msg': msg}, status=400)
        except Exception as exc:
            msg = f'Lỗi khi lấy metadata: {exc}'
            if is_ajax:
                return JsonResponse({'ok': False, 'msg': msg}, status=500)
        self.message_user(request, msg)
        return redirect(reverse('admin:videos_videolesson_change', args=[pk]))

    def extract_thumbnail_view(self, request, pk):
        lesson = get_object_or_404(VideoLesson, pk=pk)
        is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
        if not lesson.video_id:
            msg = 'Bài học chưa có video_id.'
            if is_ajax:
                return JsonResponse({'ok': False, 'msg': msg}, status=400)
            self.message_user(request, msg, level='error')
            return redirect(reverse('admin:videos_videolesson_change', args=[pk]))
        try:
            data = get_video_storage().extract_thumbnail(lesson.video_id)
            if data:
                filename = f'{lesson.video_id}.jpg'
                lesson.thumbnail.save(filename, ContentFile(data), save=True)
                thumbnail_url = lesson.thumbnail.url if lesson.thumbnail else None
                msg = 'Đã lấy thumbnail từ video thành công.'
                if is_ajax:
                    return JsonResponse({'ok': True, 'msg': msg, 'thumbnail_url': thumbnail_url})
            else:
                msg = 'Không thể lấy thumbnail từ video.'
                if is_ajax:
                    return JsonResponse({'ok': False, 'msg': msg}, status=400)
        except Exception as exc:
            msg = f'Lỗi khi lấy thumbnail: {exc}'
            if is_ajax:
                return JsonResponse({'ok': False, 'msg': msg}, status=500)
        self.message_user(request, msg)
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

    def import_quiz_notebooklm_view(self, request, pk):
        lesson = get_object_or_404(VideoLesson, pk=pk)
        if request.method == 'POST':
            from exams.utils import parse_questions_csv_notebooklm, provision_training_activity
            csv_file = request.FILES.get('file')
            if not csv_file:
                self.message_user(request, 'Không tìm thấy file.', level='error')
            else:
                _, exam = provision_training_activity('lesson', lesson, 'QUIZ')
                result = parse_questions_csv_notebooklm(csv_file, exam)
                msg = f'Đã import {result["created"]} câu hỏi.'
                if result['skipped']:
                    msg += f' Bỏ qua {result["skipped"]} dòng.'
                self.message_user(request, msg, level='success' if result['created'] else 'warning')
                for err in result['errors'][:10]:
                    self.message_user(request, f'Dòng {err["row"]}: {err["error"]}', level='warning')
            return redirect(reverse('admin:videos_videolesson_change', args=[pk]))

        from django.template.response import TemplateResponse
        return TemplateResponse(request, 'admin/videos/videolesson/import_quiz_notebooklm.html', {
            'lesson': lesson,
            'title': f'Import Quiz (NotebookLM) — {lesson.title}',
            'opts': self.model._meta,
        })

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
        extra_context['import_quiz_notebooklm_url'] = reverse('admin:videos_videolesson_import_quiz_notebooklm', args=[object_id])

        pk = int(object_id)
        prev_obj = VideoLesson.objects.filter(pk__lt=pk).order_by('-pk').values('pk').first()
        next_obj = VideoLesson.objects.filter(pk__gt=pk).order_by('pk').values('pk').first()
        if prev_obj:
            extra_context['prev_url'] = reverse('admin:videos_videolesson_change', args=[prev_obj['pk']]) + '#video-tab'
        if next_obj:
            extra_context['next_url'] = reverse('admin:videos_videolesson_change', args=[next_obj['pk']]) + '#video-tab'

        return super().change_view(request, object_id, form_url, extra_context)

    def save_model(self, request, obj, form, change):
        if not obj.slug:
            base = slugify(obj.title, allow_unicode=False) or 'lesson'
            slug = base
            n = 1
            while VideoLesson.objects.filter(course=obj.course, slug=slug).exclude(pk=obj.pk).exists():
                slug = f'{base}-{n}'
                n += 1
            obj.slug = slug
        super().save_model(request, obj, form, change)
        video_file = form.cleaned_data.get('video_upload')
        if video_file:
            try:
                result = get_video_storage().upload(video_file, video_file.name)
                obj.video_id  = result.video_id
                obj.video_url = result.video_url
                obj.save(update_fields=['video_id', 'video_url'])
                # Fetch duration + thumbnail after Bunny finishes transcoding
                # from .tasks import fetch_video_metadata_after_transcode
                # fetch_video_metadata_after_transcode.delay(obj.pk)
                self.message_user(request, 'Video đã upload. Duration và thumbnail sẽ được cập nhật tự động sau khi Bunny transcode xong.')
            except Exception as exc:
                self.message_user(request, f'Upload video thất bại: {exc}', level='error')

        pdf_file = form.cleaned_data.get('infographic_pdf_upload')
        if pdf_file:
            from .bunny_file_storage import upload_pdf_to_bunny
            try:
                key = upload_pdf_to_bunny(
                    pdf_file,
                    lesson_pk=obj.pk,
                    lesson_uuid=str(obj.public_id),
                    existing_key=obj.infographic_pdf_key,
                )
                obj.infographic_pdf_key = key
                obj.save(update_fields=['infographic_pdf_key'])
                self.message_user(request, f'Đã upload lược đồ PDF: {key}')
            except Exception as exc:
                self.message_user(request, f'Upload PDF thất bại: {exc}', level='error')



@admin.register(UserVideoPurchase)
class UserVideoPurchaseAdmin(admin.ModelAdmin):
    list_display = ('user', 'video', 'created_at')
    list_filter = ('created_at',)


class CourseCompletionFilter(admin.SimpleListFilter):
    title = 'Mức hoàn thành'
    parameter_name = 'completion'

    def lookups(self, request, model_admin):
        return [
            ('completed', 'Đã hoàn thành'),
            ('in_progress', 'Đang học'),
            ('just_started', 'Mới bắt đầu (< 60s)'),
        ]

    def queryset(self, request, queryset):
        if self.value() == 'completed':
            return queryset.filter(completed=True)
        if self.value() == 'in_progress':
            return queryset.filter(completed=False, progress_seconds__gt=0)
        if self.value() == 'just_started':
            return queryset.filter(progress_seconds__lt=60)
        return queryset


@admin.register(UserLessonProgress)
class UserLessonProgressAdmin(admin.ModelAdmin):
    list_display = ('user_link', 'course_title', 'lesson_title', 'progress_seconds', 'completed', 'last_watched')
    list_filter = ('completed', ('lesson__course', admin.RelatedFieldListFilter), CourseCompletionFilter)
    search_fields = ('user__username', 'user__phone_number', 'lesson__title', 'lesson__course__title')
    date_hierarchy = 'last_watched'
    raw_id_fields = ('user', 'lesson')
    ordering = ('-last_watched',)
    show_full_result_count = False

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'lesson', 'lesson__course')

    def user_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.user_id])
        return format_html('<a href="{}">{}</a>', url, obj.user.username)
    user_link.short_description = 'User'
    user_link.admin_order_field = 'user__username'

    def course_title(self, obj):
        url = reverse('admin:videos_videocourse_change', args=[obj.lesson.course_id])
        return format_html('<a href="{}">{}</a>', url, obj.lesson.course.title)
    course_title.short_description = 'Khoá học'
    course_title.admin_order_field = 'lesson__course__title'

    def lesson_title(self, obj):
        return f"#{obj.lesson.order} {obj.lesson.title}"
    lesson_title.short_description = 'Bài học'
    lesson_title.admin_order_field = 'lesson__order'
