"""Training API URL config — §7.9"""
from django.urls import path

from . import views_training as v

urlpatterns = [
    path('lesson/<slug:lesson_slug>/', v.TrainingSetByLessonView.as_view()),
    path('chapter/<slug:book_slug>/<int:chapter_order>/', v.TrainingSetByChapterView.as_view()),
    path('activities/<uuid:activity_id>/flashcards/', v.ActivityFlashcardsView.as_view()),
    path('activities/<uuid:activity_id>/flashcards/import/', v.FlashcardImportView.as_view()),
    path('activities/<uuid:activity_id>/flashcards/export-template/', v.FlashcardExportTemplateView.as_view()),
    path('activities/<uuid:activity_id>/exam/', v.ActivityExamView.as_view()),
]
