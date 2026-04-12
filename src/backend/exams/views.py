from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import timedelta
from rest_framework import generics, status, views
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser

from .models import (
    PracticeModule, Exam, PracticeQuestion, UserExamProgress,
    Flashcard, FlashcardReview,
)
from .serializers import (
    PracticeModuleSerializer, ExamListSerializer, ExamDetailSerializer,
    ExamSubmitSerializer, FlashcardSerializer, FlashcardReviewSerializer,
)
from .utils import (
    parse_questions_csv, parse_flashcards_csv,
    QUESTIONS_CSV_TEMPLATE, FLASHCARDS_CSV_TEMPLATE,
)


# ---------- Exam APIs ----------

class ExamListView(generics.ListAPIView):
    """GET /api/exams/ - List exams (filter by module, exam_type)."""
    permission_classes = (IsAuthenticated,)
    serializer_class = ExamListSerializer
    queryset = Exam.objects.all()

    def get_queryset(self):
        qs = Exam.objects.all()
        module_slug = self.request.query_params.get('module')
        if module_slug:
            qs = qs.filter(module__slug=module_slug)
        exam_type = self.request.query_params.get('exam_type')
        if exam_type:
            qs = qs.filter(exam_type=exam_type)
        return qs.order_by('-created_at')


class ExamDetailView(generics.RetrieveAPIView):
    """GET /api/exams/{slug}/ - Exam detail with questions (no correct_answer)."""
    permission_classes = (IsAuthenticated,)
    serializer_class = ExamDetailSerializer
    queryset = Exam.objects.all()
    lookup_field = 'slug'
    lookup_url_kwarg = 'slug'


class ExamSubmitView(views.APIView):
    """POST /api/exams/{slug}/submit/ - Submit answers, return score."""
    permission_classes = (IsAuthenticated,)
    serializer_class = ExamSubmitSerializer

    def post(self, request, slug):
        try:
            exam = Exam.objects.get(slug=slug)
        except Exam.DoesNotExist:
            return Response({'detail': 'Exam not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = ExamSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        answers = {item['question_id']: item['answer'] for item in serializer.validated_data['answers']}

        # §2.3: score only submitted questions (supports QUIZ random 10-question subset)
        from uuid import UUID
        submitted_ids = []
        for qid in answers:
            try:
                submitted_ids.append(UUID(qid))
            except ValueError:
                pass
        questions_qs = exam.questions.filter(public_id__in=submitted_ids) if submitted_ids else exam.questions.none()

        question_results = []
        total_score = 0
        max_score = 0
        for q in questions_qs:
            max_score += q.points
            ans = answers.get(str(q.public_id))
            is_correct = bool(
                ans and str(ans).strip().lower() == str(q.correct_answer).strip().lower()
            )
            if is_correct:
                total_score += q.points
            question_results.append({
                'question_id': str(q.public_id),
                'correct_answer': q.correct_answer,
                'is_correct': is_correct,
            })

        score_pct = round((total_score / max_score * 100) if max_score else 0)
        is_passed = score_pct >= exam.passing_score

        progress, _ = UserExamProgress.objects.get_or_create(
            user=request.user,
            exam=exam,
            defaults={'score': 0, 'attempts': 0},
        )
        progress.score = score_pct
        progress.is_passed = is_passed
        progress.attempts += 1
        progress.last_attempt = timezone.now()
        progress.answers_snapshot = serializer.validated_data['answers']
        progress.save()

        return Response({
            'score': score_pct,
            'max_score': max_score,
            'total_points_earned': total_score,
            'is_passed': is_passed,
            'passing_score': exam.passing_score,
            'attempts': progress.attempts,
            'question_results': question_results,  # used by frontend review screen
        })


# ---------- Practice (modules & flashcards) APIs ----------

class PracticeModuleListView(generics.ListAPIView):
    """GET /api/practice/modules/ - List practice modules."""
    permission_classes = (IsAuthenticated,)
    serializer_class = PracticeModuleSerializer
    queryset = PracticeModule.objects.all().order_by('order', 'title')


class PracticeModuleExamsView(generics.ListAPIView):
    """GET /api/practice/modules/{slug}/exams/ - List exams in module."""
    permission_classes = (IsAuthenticated,)
    serializer_class = ExamListSerializer

    def get_queryset(self):
        return Exam.objects.filter(module__slug=self.kwargs['slug']).order_by('title')


class PracticeModuleFlashcardsView(generics.ListAPIView):
    """GET /api/practice/modules/{slug}/flashcards/ - List flashcards in module."""
    permission_classes = (IsAuthenticated,)
    serializer_class = FlashcardSerializer

    def get_queryset(self):
        return Flashcard.objects.filter(module__slug=self.kwargs['slug']).order_by('order')


def sm2(quality, interval, ease_factor, repetitions):
    """SM-2 algorithm. Returns (new_interval, new_ef, new_repetitions)."""
    if quality < 3:
        return (0, ease_factor, 0)  # reset
    if repetitions == 0:
        interval = 1
    elif repetitions == 1:
        interval = 6
    else:
        interval = round(interval * ease_factor)
    ef = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    ef = max(1.3, ef)
    return (interval, ef, repetitions + 1)


class FlashcardReviewView(views.APIView):
    """POST /api/practice/flashcards/{id}/review/ - Submit SM-2 quality."""
    permission_classes = (IsAuthenticated,)
    serializer_class = FlashcardReviewSerializer

    def post(self, request, id):
        try:
            from uuid import UUID
            flashcard = Flashcard.objects.get(public_id=UUID(id))
        except (Flashcard.DoesNotExist, ValueError):
            return Response({'detail': 'Flashcard not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = FlashcardReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        quality = serializer.validated_data['quality']

        review, created = FlashcardReview.objects.get_or_create(
            user=request.user,
            flashcard=flashcard,
            defaults={
                'interval': 0,
                'ease_factor': 2.5,
                'repetitions': 0,
            },
        )
        interval, ef, rep = sm2(quality, review.interval, review.ease_factor, review.repetitions)
        review.interval = interval
        review.ease_factor = ef
        review.repetitions = rep
        review.next_review = timezone.now() + timedelta(days=interval) if interval > 0 else None
        review.save()

        return Response({
            'next_review': review.next_review.isoformat() if review.next_review else None,
            'interval': review.interval,
            'repetitions': review.repetitions,
        })


# ---------- CSV Import / Export ----------

class QuestionImportView(views.APIView):
    """POST /api/exams/{slug}/questions/import/ - Import questions from CSV (admin only)."""
    permission_classes = (IsAdminUser,)
    parser_classes = (MultiPartParser,)

    def post(self, request, slug):
        exam = get_object_or_404(Exam, slug=slug)
        csv_file = request.FILES.get('file')
        if not csv_file:
            return Response({'detail': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)
        result = parse_questions_csv(csv_file, exam)
        return Response(result, status=status.HTTP_200_OK)


class QuestionExportTemplateView(views.APIView):
    """GET /api/exams/questions/export-template/ - Download questions CSV template."""
    permission_classes = (IsAdminUser,)

    def get(self, request):
        response = HttpResponse(QUESTIONS_CSV_TEMPLATE, content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="questions_template.csv"'
        return response


class FlashcardImportView(views.APIView):
    """POST /api/exams/flashcards/{lesson_slug}/import/ - Import flashcards CSV for a lesson (admin only)."""
    permission_classes = (IsAdminUser,)
    parser_classes = (MultiPartParser,)

    def post(self, request, lesson_slug):
        from videos.models import VideoLesson
        lesson = get_object_or_404(VideoLesson, slug=lesson_slug)
        csv_file = request.FILES.get('file')
        if not csv_file:
            return Response({'detail': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)
        result = parse_flashcards_csv(csv_file, lesson)
        return Response(result, status=status.HTTP_200_OK)


class FlashcardExportTemplateView(views.APIView):
    """GET /api/exams/flashcards/export-template/ - Download flashcards CSV template."""
    permission_classes = (IsAdminUser,)

    def get(self, request):
        response = HttpResponse(FLASHCARDS_CSV_TEMPLATE, content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="flashcards_template.csv"'
        return response
