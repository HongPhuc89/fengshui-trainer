from django.conf import settings
from django.db.models import Sum
from django.utils import timezone
from rest_framework import serializers
from .models import VideoCategory, VideoCourse, VideoLesson, UserVideoPurchase, UserLessonProgress

# "New" is a rolling window off published_date, not an admin-set flag — no
# state to forget to unset once a course ages out.
NEW_RELEASE_WINDOW_DAYS = 30


def _is_new_release(published_date):
    if not published_date:
        return False
    return (timezone.now().date() - published_date).days <= NEW_RELEASE_WINDOW_DAYS


class VideoCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = VideoCategory
        fields = ('public_id', 'title', 'slug')


class VideoLessonListSerializer(serializers.ModelSerializer):
    # Both computed from context the parent course serializer builds once per
    # request (VideoCourseDetailView.get_serializer_context) — not per lesson,
    # to avoid one purchase/progress query per lesson in a course.
    can_access = serializers.SerializerMethodField()
    is_completed = serializers.SerializerMethodField()

    def get_can_access(self, obj):
        # Mirrors views._can_access_lesson(): free lessons are always playable,
        # everything else needs VIP or a course purchase.
        return obj.is_free or bool(self.context.get('can_access_paid_lessons'))

    def get_is_completed(self, obj):
        return obj.id in self.context.get('completed_lesson_ids', frozenset())

    class Meta:
        model = VideoLesson
        fields = ('public_id', 'title', 'slug', 'order', 'duration_seconds', 'thumbnail',
                  'small_thumbnail', 'is_free', 'can_access', 'is_completed')


class VideoCourseListSerializer(serializers.ModelSerializer):
    category = VideoCategorySerializer(read_only=True)
    total_duration_seconds = serializers.SerializerMethodField()
    cover_image = serializers.SerializerMethodField()
    price_lt = serializers.SerializerMethodField()
    is_new_release = serializers.SerializerMethodField()

    def get_total_duration_seconds(self, obj):
        result = obj.lessons.aggregate(total=Sum('duration_seconds'))['total']
        return result or 0

    def get_price_lt(self, obj):
        return 0 if obj.is_free else obj.price_lt

    def get_is_new_release(self, obj):
        return _is_new_release(obj.published_date)

    def get_cover_image(self, obj):
        if obj.cover_image:
            return obj.cover_image
        first = obj.lessons.order_by('order').exclude(thumbnail='').filter(thumbnail__isnull=False).first()
        if first and first.thumbnail:
            if first.small_thumbnail:
                return first.small_thumbnail
            request = self.context.get('request')
            return request.build_absolute_uri(first.thumbnail.url) if request else first.thumbnail.url
        return None

    class Meta:
        model = VideoCourse
        fields = (
            'public_id', 'title', 'slug', 'category', 'instructor', 'cover_image',
            'description', 'is_free', 'is_new_release', 'price_lt', 'total_duration_seconds',
            'total_lessons', 'level', 'published_date',
        )


class VideoCourseDetailSerializer(serializers.ModelSerializer):
    category = VideoCategorySerializer(read_only=True)
    lessons = VideoLessonListSerializer(many=True, read_only=True)
    final_exam_id = serializers.SerializerMethodField()
    cover_image = serializers.SerializerMethodField()
    price_lt = serializers.SerializerMethodField()
    is_new_release = serializers.SerializerMethodField()

    def get_final_exam_id(self, obj):
        return str(obj.final_exam_id) if obj.final_exam_id else None

    def get_price_lt(self, obj):
        return 0 if obj.is_free else obj.price_lt

    def get_is_new_release(self, obj):
        return _is_new_release(obj.published_date)

    def get_cover_image(self, obj):
        if obj.cover_image:
            return obj.cover_image
        first = next((l for l in obj.lessons.all() if l.thumbnail), None)
        if first:
            if first.small_thumbnail:
                return first.small_thumbnail
            request = self.context.get('request')
            return request.build_absolute_uri(first.thumbnail.url) if request else first.thumbnail.url
        return None

    class Meta:
        model = VideoCourse
        fields = (
            'public_id', 'title', 'slug', 'category', 'instructor', 'cover_image',
            'description', 'trailer_url', 'is_free', 'is_new_release', 'price_lt',
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
    hls_url = serializers.SerializerMethodField()
    hls_headers = serializers.SerializerMethodField()
    infographic_pdf_url = serializers.SerializerMethodField()

    def get_video_url(self, obj):
        # Can be overridden by view to inject signed URL
        return getattr(obj, '_resolved_video_url', obj.video_url) or obj.video_url

    def get_hls_url(self, obj):
        """
        Direct HLS master playlist, for clients that decode media themselves.

        video_url is a Bunny iframe embed *page*: a browser can drop it into an
        <iframe>, but ExoPlayer and AVPlayer cannot decode HTML. Native clients
        need the playlist instead. Returns None when Bunny is not the backend or
        the lesson has no Bunny id, so callers can fall back to video_url.
        """
        if settings.VIDEO_STORAGE_BACKEND != 'bunny' or not obj.video_id:
            return None
        return f'https://{settings.BUNNY_CDN_HOSTNAME}/{obj.video_id}/playlist.m3u8'

    def get_hls_headers(self, obj):
        """
        Headers the player must send with hls_url.

        The pull zone answers 403 to an empty Referer. Serving the header from
        here keeps the policy on the server: if Bunny is later switched to token
        auth, clients need no change.
        """
        if not self.get_hls_url(obj):
            return None
        return {'Referer': settings.BUNNY_STREAM_REFERER}

    def get_infographic_pdf_url(self, obj):
        if not obj.infographic_pdf_key:
            return None
        request = self.context.get('request')
        path = f'/api/videos/lessons/{obj.public_id}/infographic-pdf/'
        if request:
            return request.build_absolute_uri(path)
        return path

    class Meta:
        model = VideoLesson
        fields = (
            'public_id', 'title', 'slug', 'order', 'description',
            'video_url', 'hls_url', 'hls_headers', 'video_id',
            'duration_seconds', 'transcript', 'summary',
            'thumbnail', 'small_thumbnail', 'is_free', 'infographic_pdf_url', 'infographic_video_url',
        )


class LessonProgressSerializer(serializers.Serializer):
    progress_seconds = serializers.IntegerField(min_value=0)


class CourseProgressSerializer(serializers.Serializer):
    progress_percent = serializers.IntegerField()
    completed_lessons = serializers.IntegerField()
    total_lessons = serializers.IntegerField()
