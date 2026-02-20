from django.urls import path
from . import views

urlpatterns = [
    path('', views.ExamListView.as_view(), name='exam_list'),
    path('<slug:slug>/', views.ExamDetailView.as_view(), name='exam_detail'),
    path('<slug:slug>/submit/', views.ExamSubmitView.as_view(), name='exam_submit'),
]
