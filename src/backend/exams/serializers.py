from rest_framework import serializers
from .models import PracticeModule, Exam, PracticeQuestion, UserExamProgress, Flashcard, FlashcardReview


class PracticeModuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = PracticeModule
        fields = ('public_id', 'title', 'slug', 'description', 'order')


class PracticeQuestionListSerializer(serializers.ModelSerializer):
    """Without correct_answer — used for FINAL_EXAM detail (security: hide answer)."""
    class Meta:
        model = PracticeQuestion
        fields = ('public_id', 'question_type', 'question_text', 'options', 'points', 'order', 'difficulty')


class PracticeQuestionWithAnswerSerializer(serializers.ModelSerializer):
    """With correct_answer — used for PRACTICE/QUIZ exam detail (immediate feedback)."""
    class Meta:
        model = PracticeQuestion
        fields = ('public_id', 'question_type', 'question_text', 'options',
                  'correct_answer', 'points', 'order', 'difficulty')


class UserExamProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserExamProgress
        fields = ('score', 'is_passed', 'attempts', 'last_attempt')


class ExamListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exam
        fields = ('public_id', 'title', 'slug', 'description', 'exam_type', 'time_limit_minutes', 'passing_score')


class ExamDetailSerializer(serializers.ModelSerializer):
    # §2.2: questions field varies by exam_type — see get_questions()
    questions = serializers.SerializerMethodField()
    total_questions = serializers.SerializerMethodField()
    user_progress = serializers.SerializerMethodField()

    def get_questions(self, obj):
        """Return correct_answer for PRACTICE/QUIZ (immediate feedback UX).
        Hide correct_answer for FINAL_EXAM (security)."""
        qs = obj.questions.all().order_by('order')
        if obj.exam_type in ('PRACTICE', 'QUIZ'):
            return PracticeQuestionWithAnswerSerializer(qs, many=True).data
        return PracticeQuestionListSerializer(qs, many=True).data

    def get_total_questions(self, obj):
        return obj.questions.count()

    def get_user_progress(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        try:
            progress = obj.user_progresses.get(user=request.user)
            return UserExamProgressSerializer(progress).data
        except UserExamProgress.DoesNotExist:
            return None

    class Meta:
        model = Exam
        fields = (
            'public_id', 'title', 'slug', 'description', 'exam_type',
            'time_limit_minutes', 'passing_score', 'total_questions',
            'questions', 'user_progress',
        )


class ExamSubmitSerializer(serializers.Serializer):
    answers = serializers.ListField(
        child=serializers.DictField(),
        help_text='[{"question_id": "uuid", "answer": "a"}, ...]',
    )


class FlashcardReviewInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = FlashcardReview
        fields = ('repetitions', 'next_review', 'interval')


class FlashcardWithReviewSerializer(serializers.ModelSerializer):
    is_due = serializers.SerializerMethodField()
    user_review = serializers.SerializerMethodField()

    def get_is_due(self, obj):
        due_ids = self.context.get('due_ids', set())
        return obj.id in due_ids

    def get_user_review(self, obj):
        reviews = self.context.get('reviews', {})
        review = reviews.get(obj.id)
        if review:
            return FlashcardReviewInfoSerializer(review).data
        return None

    class Meta:
        model = Flashcard
        fields = ('public_id', 'category', 'front', 'back', 'difficulty', 'is_due', 'user_review')


class FlashcardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Flashcard
        fields = ('public_id', 'category', 'front', 'back', 'image', 'difficulty', 'order')


class FlashcardReviewSerializer(serializers.Serializer):
    quality = serializers.IntegerField(min_value=0, max_value=5, help_text='SM-2 quality 0-5')
