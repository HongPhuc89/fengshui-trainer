from rest_framework import serializers
from .models import Comment, CommentReply


class CommentReplySerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.username or str(obj.user.public_id)

    class Meta:
        model = CommentReply
        fields = ('public_id', 'user', 'user_name', 'body', 'created_at')
        read_only_fields = ('user',)


class CommentSerializer(serializers.ModelSerializer):
    replies = CommentReplySerializer(many=True, read_only=True)
    user_name = serializers.SerializerMethodField()

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.username or str(obj.user.public_id)

    class Meta:
        model = Comment
        fields = (
            'public_id', 'user', 'user_name', 'content_type', 'object_id',
            'body', 'is_pinned', 'replies', 'created_at',
        )
        read_only_fields = ('user', 'content_type', 'object_id', 'is_pinned')


class CommentCreateSerializer(serializers.Serializer):
    content_type = serializers.ChoiceField(choices=['book', 'video_course'])
    object_id = serializers.UUIDField()
    body = serializers.CharField(max_length=5000)


class CommentReplyCreateSerializer(serializers.Serializer):
    body = serializers.CharField(max_length=5000)
