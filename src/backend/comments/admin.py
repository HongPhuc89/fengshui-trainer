from django.contrib import admin
from .models import Comment, CommentReply


class CommentReplyInline(admin.TabularInline):
    model = CommentReply
    extra = 0


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('user', 'content_type', 'object_id', 'body_short', 'is_pinned', 'created_at')
    list_filter = ('content_type', 'is_pinned', 'created_at')
    search_fields = ('body', 'user__username')
    raw_id_fields = ('user',)
    inlines = [CommentReplyInline]

    def body_short(self, obj):
        return (obj.body[:50] + '...') if len(obj.body) > 50 else obj.body

    body_short.short_description = 'Body'


@admin.register(CommentReply)
class CommentReplyAdmin(admin.ModelAdmin):
    list_display = ('comment', 'user', 'body_short', 'created_at')
    raw_id_fields = ('comment', 'user')

    def body_short(self, obj):
        return (obj.body[:40] + '...') if len(obj.body) > 40 else obj.body

    body_short.short_description = 'Body'
