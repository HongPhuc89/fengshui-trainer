"""
Training API views — §4, §7 của detail design.

Endpoints:
  GET  /api/training/lesson/<lesson_slug>/
  GET  /api/training/chapter/<book_slug>/<chapter_order>/
  GET  /api/training/activities/<activity_id>/flashcards/
  GET  /api/training/activities/<activity_id>/exam/
  POST /api/training/activities/<activity_id>/flashcards/import/
  GET  /api/training/activities/<activity_id>/flashcards/export-template/
"""
import random

from django.shortcuts import get_object_or_404
from rest_framework import views, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response

from books.models import BookChapter
from books.views import _can_access_chapter
from videos.models import VideoLesson
from videos.views import _can_access_lesson

from .models import TrainingSet, TrainingActivity, Flashcard
from .serializers_training import TrainingSetSerializer, FlashcardForSessionSerializer
from .utils import FLASHCARDS_CSV_TEMPLATE


# ---------------------------------------------------------------------------
# Access helpers (§4.2)
# ---------------------------------------------------------------------------

def _verify_training_set_access(user, training_set) -> bool:
    """Check if user can access a TrainingSet based on its source type."""
    if training_set.lesson_id:
        lesson = training_set.lesson
        return _can_access_lesson(user, lesson.course, lesson)
    if training_set.chapter_id:
        chapter = training_set.chapter
        return _can_access_chapter(user, chapter.book, chapter)
    # STANDALONE module — auth only
    return user.is_authenticated


def _get_activity_or_403(user, activity_id):
    """
    Lookup TrainingActivity by public_id and verify access.
    select_related prevents N+1 in _verify_training_set_access (§T2).
    """
    activity = get_object_or_404(
        TrainingActivity.objects.select_related(
            'training_set__lesson__course',
            'training_set__chapter__book',
            'training_set__module',
        ),
        public_id=activity_id,
    )
    if not _verify_training_set_access(user, activity.training_set):
        raise PermissionDenied("Bạn không có quyền truy cập nội dung luyện tập này.")
    return activity


def _training_set_queryset():
    """Base queryset with all required select/prefetch for TrainingSetSerializer (§7.8 / §T1)."""
    return TrainingSet.objects.select_related(
        'lesson__course',
        'chapter__book',
        'module',
    ).prefetch_related(
        'activities',
    )


# ---------------------------------------------------------------------------
# Views
# ---------------------------------------------------------------------------

class TrainingSetByLessonView(views.APIView):
    """GET /api/training/lesson/<lesson_slug>/ — §7.1"""

    permission_classes = [IsAuthenticated]

    def get(self, request, lesson_slug):
        lesson = get_object_or_404(VideoLesson.objects.select_related('course'), slug=lesson_slug)
        if not _can_access_lesson(request.user, lesson.course, lesson):
            return Response(
                {'detail': 'Cần mua khóa học hoặc nâng cấp VIP để luyện tập.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        training_set = get_object_or_404(_training_set_queryset(), lesson=lesson)
        serializer = TrainingSetSerializer(training_set, context={'request': request})
        return Response(serializer.data)


class TrainingSetByChapterView(views.APIView):
    """
    GET /api/training/chapter/<book_slug>/<chapter_order>/ — §7.2
    Returns 404 if chapter has no TrainingSet (frontend shows EMPTY_STATE).
    Note: <int:chapter_order> validates integer-positive only; view returns 404 naturally
    for non-existent orders (edge cases: 0, 99999 covered by get_object_or_404).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, book_slug, chapter_order):
        chapter = get_object_or_404(
            BookChapter.objects.select_related('book'),
            book__slug=book_slug,
            order=chapter_order,
        )
        if not _can_access_chapter(request.user, chapter.book, chapter):
            return Response(
                {'detail': 'Cần mua sách hoặc nâng cấp VIP để luyện tập.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        training_set = get_object_or_404(_training_set_queryset(), chapter=chapter)
        serializer = TrainingSetSerializer(training_set, context={'request': request})
        return Response(serializer.data)


class ActivityFlashcardsView(views.APIView):
    """GET /api/training/activities/<activity_id>/flashcards/?count=20 — §7.3 (feature-10)

    Pure random sampling — no SM-2 priority.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, activity_id):
        activity = _get_activity_or_403(request.user, activity_id)

        try:
            count = int(request.query_params.get('count', 20))
            count = max(1, min(count, 100))
        except (ValueError, TypeError):
            count = 20

        flashcards = list(activity.flashcards.all())
        random.shuffle(flashcards)
        selected = flashcards[:count]

        serializer = FlashcardForSessionSerializer(selected, many=True)
        return Response({
            'count': len(selected),
            'total': len(flashcards),
            'flashcards': serializer.data,
        })


class ActivityExamView(views.APIView):
    """GET /api/training/activities/<activity_id>/exam/ — §7.4"""

    permission_classes = [IsAuthenticated]

    def get(self, request, activity_id):
        activity = _get_activity_or_403(request.user, activity_id)
        exam = getattr(activity, 'exam', None)
        if not exam:
            return Response({'detail': 'Bài kiểm tra chưa được tạo.'}, status=status.HTTP_404_NOT_FOUND)

        from .serializers import ExamDetailSerializer
        serializer = ExamDetailSerializer(exam, context={'request': request})
        return Response(serializer.data)


class FlashcardImportView(views.APIView):
    """POST /api/training/activities/<activity_id>/flashcards/import/ — §7.5 / §6.2

    Staff only. Replaces old /api/exams/flashcards/{lesson_slug}/import/ endpoint.
    """

    permission_classes = [IsAuthenticated, IsAdminUser]
    parser_classes = [MultiPartParser]

    def post(self, request, activity_id):
        activity = get_object_or_404(TrainingActivity, public_id=activity_id)

        if activity.activity_type != TrainingActivity.ActivityType.FLASHCARD:
            return Response(
                {'detail': 'Activity này không phải loại FLASHCARD.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        csv_file = request.FILES.get('file')
        if not csv_file:
            return Response({'detail': 'Không tìm thấy file.'}, status=status.HTTP_400_BAD_REQUEST)

        from .utils import parse_flashcards_csv_for_activity
        result = parse_flashcards_csv_for_activity(csv_file, activity)
        return Response(result, status=status.HTTP_201_CREATED if result['created'] else status.HTTP_200_OK)


class FlashcardExportTemplateView(views.APIView):
    """GET /api/training/activities/<activity_id>/flashcards/export-template/ — §6.2"""

    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request, activity_id):
        # Validate activity exists (any authenticated admin can download template)
        get_object_or_404(TrainingActivity, public_id=activity_id)
        from django.http import HttpResponse
        response = HttpResponse(FLASHCARDS_CSV_TEMPLATE, content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="flashcards_template.csv"'
        return response
