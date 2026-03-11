from django.db.models import Sum
from rest_framework import serializers
from .models import VideoCategory, VideoCourse, VideoLesson, UserVideoPurchase, UserLessonProgress


class VideoCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = VideoCategory
        fields = ('public_id', 'title', 'slug')


class VideoLessonListSerializer(serializers.ModelSerializer):
    class Meta:
        model = VideoLesson
        fields = ('public_id', 'title', 'slug', 'order', 'duration_seconds', 'thumbnail', 'is_free')


class VideoCourseListSerializer(serializers.ModelSerializer):
    category = VideoCategorySerializer(read_only=True)
    total_duration_seconds = serializers.SerializerMethodField()
    cover_image = serializers.SerializerMethodField()
    price_lt = serializers.SerializerMethodField()

    def get_total_duration_seconds(self, obj):
        result = obj.lessons.aggregate(total=Sum('duration_seconds'))['total']
        return result or 0

    def get_price_lt(self, obj):
        return 0 if obj.is_free else obj.price_lt

    def get_cover_image(self, obj):
        if obj.cover_image:
            return obj.cover_image
        first = obj.lessons.order_by('order').exclude(thumbnail='').filter(thumbnail__isnull=False).first()
        if first and first.thumbnail:
            request = self.context.get('request')
            return request.build_absolute_uri(first.thumbnail.url) if request else first.thumbnail.url
        return None

    class Meta:
        model = VideoCourse
        fields = (
            'public_id', 'title', 'slug', 'category', 'instructor', 'cover_image',
            'description', 'is_free', 'price_lt', 'total_duration_seconds', 'total_lessons',
            'level', 'published_date',
        )


class VideoCourseDetailSerializer(serializers.ModelSerializer):
    category = VideoCategorySerializer(read_only=True)
    lessons = VideoLessonListSerializer(many=True, read_only=True)
    final_exam_id = serializers.SerializerMethodField()
    cover_image = serializers.SerializerMethodField()
    price_lt = serializers.SerializerMethodField()

    def get_final_exam_id(self, obj):
        return str(obj.final_exam_id) if obj.final_exam_id else None

    def get_price_lt(self, obj):
        return 0 if obj.is_free else obj.price_lt

    def get_cover_image(self, obj):
        if obj.cover_image:
            return obj.cover_image
        first = next((l for l in obj.lessons.all() if l.thumbnail), None)
        if first:
            request = self.context.get('request')
            return request.build_absolute_uri(first.thumbnail.url) if request else first.thumbnail.url
        return None

    class Meta:
        model = VideoCourse
        fields = (
            'public_id', 'title', 'slug', 'category', 'instructor', 'cover_image',
            'description', 'trailer_url', 'is_free', 'price_lt',
            'total_duration_seconds', 'total_lessons', 'level', 'published_date',
            'lessons', 'final_exam_id',
        )


class VideoCourseDetailWithPurchaseSerializer(VideoCourseDetailSerializer):
    has_purchased = serializers.SerializerMethodField()

    def get_has_purchased(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return UserVideoPurchase.objects.filter(user=request.user, video=obj).exists()

    class Meta(VideoCourseDetailSerializer.Meta):
        fields = VideoCourseDetailSerializer.Meta.fields + ('has_purchased',)


class VideoLessonDetailSerializer(serializers.ModelSerializer):
    video_url = serializers.SerializerMethodField()

    def get_video_url(self, obj):
        # Can be overridden by view to inject signed URL
        return getattr(obj, '_resolved_video_url', obj.video_url) or obj.video_url

    class Meta:
        model = VideoLesson
        fields = (
            'public_id', 'title', 'slug', 'order', 'description',
            'video_url', 'video_id', 'duration_seconds', 'transcript', 'summary',
            'thumbnail', 'is_free',
        )


class LessonProgressSerializer(serializers.Serializer):
    progress_seconds = serializers.IntegerField(min_value=0)


class CourseProgressSerializer(serializers.Serializer):
    progress_percent = serializers.IntegerField()
    completed_lessons = serializers.IntegerField()
    total_lessons = serializers.IntegerField()
