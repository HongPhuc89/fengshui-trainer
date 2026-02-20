from rest_framework import serializers
from .models import PracticeModule, Exam, PracticeQuestion, UserExamProgress, Flashcard, FlashcardReview


class PracticeModuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = PracticeModule
        fields = ('public_id', 'title', 'slug', 'description', 'order')


class PracticeQuestionListSerializer(serializers.ModelSerializer):
    """Without correct_answer for exam detail."""
    class Meta:
        model = PracticeQuestion
        fields = ('public_id', 'question_text', 'options', 'points', 'order', 'difficulty')


class ExamListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exam
        fields = ('public_id', 'title', 'slug', 'description', 'exam_type', 'time_limit_minutes', 'passing_score')


class ExamDetailSerializer(serializers.ModelSerializer):
    questions = PracticeQuestionListSerializer(many=True, read_only=True)

    class Meta:
        model = Exam
        fields = (
            'public_id', 'title', 'slug', 'description', 'exam_type',
            'time_limit_minutes', 'passing_score', 'questions',
        )


class ExamSubmitSerializer(serializers.Serializer):
    answers = serializers.ListField(
        child=serializers.DictField(),
        help_text='[{"question_id": "uuid", "answer": "a"}, ...]',
    )


class UserExamProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserExamProgress
        fields = ('exam', 'score', 'is_passed', 'attempts', 'last_attempt')


class FlashcardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Flashcard
        fields = ('public_id', 'front', 'back', 'image', 'difficulty', 'order')


class FlashcardReviewSerializer(serializers.Serializer):
    quality = serializers.IntegerField(min_value=0, max_value=5, help_text='SM-2 quality 0-5')
