from django.urls import path
from . import views

urlpatterns = [
    path('modules/', views.PracticeModuleListView.as_view(), name='practice_module_list'),
    path('modules/<slug:slug>/exams/', views.PracticeModuleExamsView.as_view(), name='practice_module_exams'),
    path('modules/<slug:slug>/flashcards/', views.PracticeModuleFlashcardsView.as_view(), name='practice_module_flashcards'),
    path('flashcards/<uuid:id>/review/', views.FlashcardReviewView.as_view(), name='flashcard_review'),
]
