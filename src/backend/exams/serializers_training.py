"""
Serializers cho Training API (§7 của detail design / feature-10 simplification).

TrainingActivitySerializer  — stats: total_count only (no due_count, no SM-2)
TrainingSetSerializer       — theo §7.1 / §7.2: source_type, source_meta, activities[]
FlashcardForSessionSerializer — danh sách thẻ cho session
"""
import logging

from rest_framework import serializers

from .models import TrainingSet, TrainingActivity, Flashcard

logger = logging.getLogger(__name__)


class FlashcardForSessionSerializer(serializers.ModelSerializer):
    """Flashcard fields needed by FlashcardSession on the frontend."""

    class Meta:
        model = Flashcard
        fields = ('public_id', 'front', 'back', 'category', 'image', 'difficulty', 'order')


class TrainingActivitySerializer(serializers.ModelSerializer):
    """
    Activity with per-user stats (feature-10: no SM-2 due_count for FLASHCARD).
    View phải prefetch activities__exam__questions, activities__exam__user_progresses.
    """

    stats = serializers.SerializerMethodField()

    class Meta:
        model = TrainingActivity
        fields = ('id', 'activity_type', 'title', 'order', 'is_active', 'stats')

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Expose public_id as 'id' per API contract
        ret['id'] = str(instance.public_id)
        return ret

    def get_stats(self, activity):
        user = self.context['request'].user

        if activity.activity_type == TrainingActivity.ActivityType.FLASHCARD:
            return {'total_count': activity.flashcards.count()}

        if activity.activity_type == TrainingActivity.ActivityType.QUIZ:
            exam = getattr(activity, 'exam', None)
            if not exam:
                return {'question_count': 0, 'last_score': None, 'is_passed': False}
            progress = exam.user_progresses.filter(user=user).first()
            return {
                'question_count': exam.questions.count(),
                'last_score': progress.score if progress else None,
                'is_passed': progress.is_passed if progress else False,
            }

        # Unknown type — warn so developers notice when adding v2 types
        logger.warning(
            "TrainingActivitySerializer.get_stats: unknown activity_type '%s' (id=%s)",
            activity.activity_type,
            activity.pk,
        )
        return {}


class TrainingSetSerializer(serializers.ModelSerializer):
    """
    Full TrainingSet response per §7.1 / §7.2.
    source_type and source_meta come from @cached_property on the model.
    View must call with select_related('lesson__course', 'chapter__book', 'module').
    """

    source_type = serializers.CharField(read_only=True)
    source_meta = serializers.SerializerMethodField()
    activities = serializers.SerializerMethodField()

    class Meta:
        model = TrainingSet
        fields = ('id', 'title', 'source_type', 'source_meta', 'activities')

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret['id'] = str(instance.public_id)
        return ret

    def get_source_meta(self, obj):
        return obj.source_meta

    def get_activities(self, obj):
        # Only expose active activities to the frontend
        active = [a for a in obj.activities.all() if a.is_active]
        return TrainingActivitySerializer(active, many=True, context=self.context).data
