from django.urls import path
from . import views

urlpatterns = [
    path('', views.ExamListView.as_view(), name='exam_list'),
    path('<slug:slug>/', views.ExamDetailView.as_view(), name='exam_detail'),
    path('<slug:slug>/submit/', views.ExamSubmitView.as_view(), name='exam_submit'),
    path('<slug:slug>/questions/import/', views.QuestionImportView.as_view(), name='exam_question_import'),
    path('questions/export-template/', views.QuestionExportTemplateView.as_view(), name='exam_question_export_template'),
    path('flashcards/<slug:lesson_slug>/import/', views.FlashcardImportView.as_view(), name='flashcard_import'),
    path('flashcards/export-template/', views.FlashcardExportTemplateView.as_view(), name='flashcard_export_template'),
]
