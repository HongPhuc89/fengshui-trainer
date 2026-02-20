from django.contrib import admin
from .models import VideoCategory, VideoCourse, VideoLesson, UserVideoPurchase, UserLessonProgress


@admin.register(VideoCategory)
class VideoCategoryAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug')
    prepopulated_fields = {'slug': ('title',)}


class VideoLessonInline(admin.TabularInline):
    model = VideoLesson
    extra = 0
    ordering = ('order',)


@admin.register(VideoCourse)
class VideoCourseAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'category', 'price_lt', 'level', 'total_lessons', 'published_date')
    list_filter = ('is_free', 'level', 'category')
    search_fields = ('title', 'instructor')
    prepopulated_fields = {'slug': ('title',)}
    raw_id_fields = ('category',)
    inlines = [VideoLessonInline]


@admin.register(VideoLesson)
class VideoLessonAdmin(admin.ModelAdmin):
    list_display = ('course', 'title', 'order', 'is_free', 'duration_seconds')
    list_filter = ('is_free',)
    raw_id_fields = ('course',)


@admin.register(UserVideoPurchase)
class UserVideoPurchaseAdmin(admin.ModelAdmin):
    list_display = ('user', 'video', 'created_at')
    list_filter = ('created_at',)
    raw_id_fields = ('user', 'video')


@admin.register(UserLessonProgress)
class UserLessonProgressAdmin(admin.ModelAdmin):
    list_display = ('user', 'lesson', 'progress_seconds', 'completed', 'last_watched')
    raw_id_fields = ('user', 'lesson')
