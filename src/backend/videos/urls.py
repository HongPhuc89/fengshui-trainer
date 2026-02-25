from django.urls import path
from . import views

urlpatterns = [
    path('categories/', views.VideoCategoryListView.as_view(), name='video_category_list'),
    path('lessons/<uuid:public_id>/upload/', views.VideoLessonUploadView.as_view(), name='video_lesson_upload'),
    path('', views.VideoCourseListView.as_view(), name='video_course_list'),
    path('<slug:slug>/', views.VideoCourseDetailView.as_view(), name='video_course_detail'),
    path('<slug:slug>/progress/', views.CourseProgressView.as_view(), name='video_course_progress'),
    path('<slug:slug>/lessons/<slug:lesson_slug>/', views.VideoLessonDetailView.as_view(), name='video_lesson_detail'),
    path('<slug:slug>/lessons/<slug:lesson_slug>/progress/', views.LessonProgressView.as_view(), name='video_lesson_progress'),
]
