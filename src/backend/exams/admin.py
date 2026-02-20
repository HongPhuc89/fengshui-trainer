from django.contrib import admin
from .models import PracticeModule, Exam, PracticeQuestion, UserExamProgress, Flashcard, FlashcardReview


@admin.register(PracticeModule)
class PracticeModuleAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'order')
    prepopulated_fields = {'slug': ('title',)}


class PracticeQuestionInline(admin.TabularInline):
    model = PracticeQuestion
    extra = 0
    ordering = ('order',)


@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'exam_type', 'module', 'passing_score', 'time_limit_minutes')
    list_filter = ('exam_type', 'module')
    search_fields = ('title', 'slug')
    prepopulated_fields = {'slug': ('title',)}
    inlines = [PracticeQuestionInline]


@admin.register(UserExamProgress)
class UserExamProgressAdmin(admin.ModelAdmin):
    list_display = ('user', 'exam', 'score', 'is_passed', 'attempts', 'last_attempt')
    list_filter = ('is_passed', 'exam')
    search_fields = ('user__username', 'exam__title')
    raw_id_fields = ('user', 'exam')
    readonly_fields = ('score', 'attempts', 'last_attempt', 'answers_snapshot')


@admin.register(Flashcard)
class FlashcardAdmin(admin.ModelAdmin):
    list_display = ('front_short', 'module', 'order')
    list_filter = ('module',)
    search_fields = ('front', 'back')

    def front_short(self, obj):
        return (obj.front[:50] + '...') if len(obj.front) > 50 else obj.front

    front_short.short_description = 'Front'


@admin.register(FlashcardReview)
class FlashcardReviewAdmin(admin.ModelAdmin):
    list_display = ('user', 'flashcard', 'next_review', 'interval', 'repetitions')
    raw_id_fields = ('user', 'flashcard')
