import random

from django.http import Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status, views
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.response import Response

from .models import (
    VideoCategory, VideoCourse, VideoLesson,
    UserVideoPurchase, UserLessonProgress,
)
from .serializers import (
    VideoCategorySerializer, VideoCourseListSerializer, VideoCourseDetailSerializer,
    VideoCourseDetailWithPurchaseSerializer, VideoLessonDetailSerializer,
    LessonProgressSerializer, CourseProgressSerializer,
)


def _can_access_lesson(user, course, lesson):
    if not user or not user.is_authenticated:
        return lesson.is_free
    if user.user_type == 'VIP':
        return True
    if UserVideoPurchase.objects.filter(user=user, video=course).exists():
        return True
    return lesson.is_free


class VideoCategoryListView(generics.ListAPIView):
    """GET /api/videos/categories/ - List categories."""
    permission_classes = (AllowAny,)
    serializer_class = VideoCategorySerializer
    queryset = VideoCategory.objects.all().order_by('title')


class VideoCourseListView(generics.ListAPIView):
    """GET /api/videos/ - List courses with filters."""
    permission_classes = (AllowAny,)
    serializer_class = VideoCourseListSerializer
    queryset = VideoCourse.objects.all().select_related('category')

    def get_queryset(self):
        qs = VideoCourse.objects.all().select_related('category')
        category_slug = self.request.query_params.get('category')
        if category_slug:
            qs = qs.filter(category__slug=category_slug)
        level = self.request.query_params.get('level')
        if level:
            qs = qs.filter(level=level)
        search = self.request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(title__icontains=search) | qs.filter(instructor__icontains=search)
        return qs.order_by('-created_at')


class VideoCourseDetailView(generics.RetrieveAPIView):
    """GET /api/videos/{slug}/ - Course detail with lessons; has_purchased if auth."""
    permission_classes = (AllowAny,)
    queryset = VideoCourse.objects.all().select_related('category').prefetch_related('lessons')
    lookup_field = 'slug'
    lookup_url_kwarg = 'slug'

    def get_serializer_class(self):
        if self.request.user.is_authenticated:
            return VideoCourseDetailWithPurchaseSerializer
        return VideoCourseDetailSerializer


class VideoLessonDetailView(views.APIView):
    """GET /api/videos/{slug}/lessons/{lesson_slug}/ - Lesson detail with video URL."""
    permission_classes = (IsAuthenticated,)
    serializer_class = VideoLessonDetailSerializer

    def get(self, request, slug, lesson_slug):
        try:
            course = VideoCourse.objects.get(slug=slug)
            lesson = VideoLesson.objects.get(course=course, slug=lesson_slug)
        except (VideoCourse.DoesNotExist, VideoLesson.DoesNotExist):
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not _can_access_lesson(request.user, course, lesson):
            return Response(
                {'detail': 'Access denied. Purchase course or upgrade to VIP.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Optional: inject signed URL from Bunny or local fallback
        from django.conf import settings
        video_url = lesson.video_url
        if settings.DEBUG and not video_url and lesson.video_id:
            video_url = request.build_absolute_uri(f'/media/videos/{lesson.video_id}.mp4')
        lesson._resolved_video_url = video_url

        serializer = VideoLessonDetailSerializer(lesson)
        return Response(serializer.data)


class VideoLessonUploadView(views.APIView):
    """POST /api/videos/lessons/<public_id>/upload/ - Upload video file to a lesson (staff only)."""
    permission_classes = (IsAdminUser,)
    parser_classes = (MultiPartParser,)

    ALLOWED_CONTENT_TYPES = {
        'video/mp4',
        'video/quicktime',       # .mov
        'video/x-matroska',      # .mkv
        'video/x-msvideo',       # .avi
        'video/webm',
    }
    MAX_SIZE_BYTES = 5 * 1024 * 1024 * 1024  # 5 GB

    def post(self, request, public_id):
        try:
            lesson = VideoLesson.objects.get(public_id=public_id)
        except VideoLesson.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        video_file = request.FILES.get('video')
        if not video_file:
            return Response({'detail': 'No video file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        if video_file.content_type not in self.ALLOWED_CONTENT_TYPES:
            return Response(
                {'detail': f'Unsupported file type: {video_file.content_type}. '
                           f'Allowed: mp4, mov, mkv, avi, webm.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if video_file.size > self.MAX_SIZE_BYTES:
            return Response(
                {'detail': 'File too large. Maximum allowed size is 5 GB.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from .storage import get_video_storage
        result = get_video_storage().upload(video_file, video_file.name)

        lesson.video_id = result.video_id
        if result.video_url:
            lesson.video_url = result.video_url
        lesson.save(update_fields=['video_id', 'video_url'])

        return Response({'video_id': result.video_id, 'video_url': result.video_url})


class LessonProgressView(views.APIView):
    """POST /api/videos/{slug}/lessons/{lesson_slug}/progress/ - Update watch progress."""
    permission_classes = (IsAuthenticated,)
    serializer_class = LessonProgressSerializer

    def post(self, request, slug, lesson_slug):
        try:
            course = VideoCourse.objects.get(slug=slug)
            lesson = VideoLesson.objects.get(course=course, slug=lesson_slug)
        except (VideoCourse.DoesNotExist, VideoLesson.DoesNotExist):
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not _can_access_lesson(request.user, course, lesson):
            return Response({'detail': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = LessonProgressSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        progress_seconds = serializer.validated_data['progress_seconds']

        progress, _ = UserLessonProgress.objects.get_or_create(
            user=request.user,
            lesson=lesson,
            defaults={'progress_seconds': 0},
        )
        progress.progress_seconds = progress_seconds
        progress.completed = (lesson.duration_seconds and progress_seconds >= lesson.duration_seconds) or progress_seconds >= (lesson.duration_seconds or 0)
        progress.last_watched = timezone.now()
        progress.save()

        return Response({
            'progress_seconds': progress.progress_seconds,
            'completed': progress.completed,
        })


class CourseProgressView(views.APIView):
    """GET /api/videos/{slug}/progress/ - Overall course progress (%)."""
    permission_classes = (IsAuthenticated,)
    serializer_class = CourseProgressSerializer

    def get(self, request, slug):
        try:
            course = VideoCourse.objects.get(slug=slug)
        except VideoCourse.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        lessons = course.lessons.all()
        total = lessons.count()
        if total == 0:
            return Response({'progress_percent': 0, 'completed_lessons': 0, 'total_lessons': 0})

        completed = UserLessonProgress.objects.filter(
            user=request.user,
            lesson__course=course,
            completed=True,
        ).count()
        percent = round(completed / total * 100)
        return Response({
            'progress_percent': percent,
            'completed_lessons': completed,
            'total_lessons': total,
        })


# ---------- Lesson Flashcards & Exam ----------

class LessonFlashcardsView(views.APIView):
    """GET /api/videos/{slug}/lessons/{lesson_slug}/flashcards/ - Smart-sampled flashcard pool."""
    permission_classes = (IsAuthenticated,)

    def get(self, request, slug, lesson_slug):
        from django.db.models import Q
        from exams.models import Flashcard, FlashcardReview
        from exams.serializers import FlashcardWithReviewSerializer

        lesson = get_object_or_404(VideoLesson, course__slug=slug, slug=lesson_slug)
        if not _can_access_lesson(request.user, lesson.course, lesson):
            return Response({'detail': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)

        count = min(int(request.query_params.get('count', 10)), 50)
        user = request.user

        all_ids = list(lesson.flashcards.values_list('id', flat=True))
        total = len(all_ids)

        if total == 0:
            return Response({'total_in_pool': 0, 'due_count': 0, 'count': 0, 'cards': []})

        # Due = has a review with next_review <= now, OR has never been reviewed
        due_ids = set(lesson.flashcards.filter(
            Q(reviews__user=user, reviews__next_review__lte=timezone.now())
            | ~Q(reviews__user=user)
        ).values_list('id', flat=True))

        due_sample = random.sample(list(due_ids), min(count, len(due_ids)))
        remaining_ids = [i for i in all_ids if i not in set(due_sample)]
        fill_count = count - len(due_sample)
        fill_sample = random.sample(remaining_ids, min(fill_count, len(remaining_ids)))

        selected_ids = due_sample + fill_sample
        random.shuffle(selected_ids)

        cards = Flashcard.objects.filter(id__in=selected_ids)
        reviews = {
            r.flashcard_id: r
            for r in FlashcardReview.objects.filter(user=user, flashcard_id__in=selected_ids)
        }
        serializer = FlashcardWithReviewSerializer(
            cards, many=True,
            context={'reviews': reviews, 'due_ids': due_ids},
        )
        return Response({
            'total_in_pool': total,
            'due_count': len(due_ids),
            'count': len(selected_ids),
            'cards': serializer.data,
        })


class LessonExamView(views.APIView):
    """GET /api/videos/{slug}/lessons/{lesson_slug}/exam/ - First PRACTICE exam for the lesson."""
    permission_classes = (IsAuthenticated,)

    def get(self, request, slug, lesson_slug):
        from exams.serializers import ExamDetailSerializer

        lesson = get_object_or_404(VideoLesson, course__slug=slug, slug=lesson_slug)
        exam = lesson.exams.filter(exam_type='PRACTICE').first()
        if not exam:
            raise Http404
        serializer = ExamDetailSerializer(exam, context={'request': request})
        return Response(serializer.data)
