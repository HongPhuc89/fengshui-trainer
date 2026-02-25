from django import forms
from django.contrib import admin
from django.core.files.base import ContentFile
from django.shortcuts import get_object_or_404, redirect
from django.urls import path, reverse
from django.utils.html import format_html

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
    fields = ('order', 'title', 'slug', 'is_free', 'duration_seconds', 'video_id')
    readonly_fields = ('video_id',)


@admin.register(VideoCourse)
class VideoCourseAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'category', 'price_lt', 'level', 'total_lessons', 'published_date')
    list_filter = ('is_free', 'level', 'category')
    search_fields = ('title', 'instructor')
    prepopulated_fields = {'slug': ('title',)}
    inlines = [VideoLessonInline]


# ── VideoLesson admin with file upload ────────────────────────────────────────

class VideoLessonAdminForm(forms.ModelForm):
    video_upload = forms.FileField(
        required=False,
        label='Upload video mới',
        help_text='Chấp nhận: mp4, mov, mkv, avi, webm — tối đa 5 GB. Để trống nếu không muốn thay đổi video hiện tại.',
        widget=forms.FileInput(attrs={
            'accept': 'video/mp4,video/quicktime,video/x-matroska,video/x-msvideo,video/webm',
        }),
    )

    class Meta:
        model = VideoLesson
        fields = '__all__'


@admin.register(VideoLesson)
class VideoLessonAdmin(admin.ModelAdmin):
    form = VideoLessonAdminForm

    list_display = ('course', 'title', 'order', 'is_free', 'duration_seconds', 'video_status')
    list_filter  = ('is_free', 'course')
    search_fields = ('title', 'course__title')
    prepopulated_fields = {'slug': ('title',)}
    readonly_fields = ('video_id', 'video_url', 'video_status', 'fetch_metadata_btn', 'extract_thumbnail_btn')

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

    def save_model(self, request, obj, form, change):
        video_file = request.FILES.get('video_upload')
        if video_file:
            if video_file.content_type not in self.ALLOWED_CONTENT_TYPES:
                self.message_user(
                    request,
                    f'Upload thất bại: loại file "{video_file.content_type}" không hợp lệ. '
                    f'Chỉ chấp nhận mp4, mov, mkv, avi, webm.',
                    level='error',
                )
            elif video_file.size > self.MAX_SIZE_BYTES:
                self.message_user(request, 'Upload thất bại: file quá lớn (tối đa 5 GB).', level='error')
            else:
                result = get_video_storage().upload(video_file, video_file.name)
                obj.video_id = result.video_id
                if result.video_url:
                    obj.video_url = result.video_url
                self.message_user(request, f'Video đã upload thành công (id: {result.video_id}).')
        super().save_model(request, obj, form, change)


@admin.register(UserVideoPurchase)
class UserVideoPurchaseAdmin(admin.ModelAdmin):
    list_display = ('user', 'video', 'created_at')
    list_filter = ('created_at',)


@admin.register(UserLessonProgress)
class UserLessonProgressAdmin(admin.ModelAdmin):
    list_display = ('user', 'lesson', 'progress_seconds', 'completed', 'last_watched')
