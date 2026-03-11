from django.urls import path
from . import views

urlpatterns = [
    path('recently-watched/', views.RecentlyWatchedCoursesView.as_view(), name='video_recently_watched'),
    path('categories/', views.VideoCategoryListView.as_view(), name='video_category_list'),
    path('lessons/<uuid:public_id>/upload/',          views.VideoLessonUploadView.as_view(),   name='video_lesson_upload'),
    path('lessons/<uuid:public_id>/upload/init/',     views.VideoUploadInitView.as_view(),     name='video_lesson_upload_init'),
    path('lessons/<uuid:public_id>/upload/complete/', views.VideoUploadCompleteView.as_view(), name='video_lesson_upload_complete'),
    path('lessons/<uuid:public_id>/upload/status/',   views.VideoUploadStatusView.as_view(),   name='video_lesson_upload_status'),
    path('', views.VideoCourseListView.as_view(), name='video_course_list'),
    path('<slug:slug>/', views.VideoCourseDetailView.as_view(), name='video_course_detail'),
    path('<slug:slug>/progress/', views.CourseProgressView.as_view(), name='video_course_progress'),
    path('<slug:slug>/progress/last-lesson/', views.CourseLastLessonView.as_view(), name='video_course_last_lesson'),
    path('<slug:slug>/lessons/<slug:lesson_slug>/', views.VideoLessonDetailView.as_view(), name='video_lesson_detail'),
    path('<slug:slug>/lessons/<slug:lesson_slug>/progress/', views.LessonProgressView.as_view(), name='video_lesson_progress'),
    path('<slug:slug>/lessons/<slug:lesson_slug>/flashcards/', views.LessonFlashcardsView.as_view(), name='lesson_flashcards'),
    path('<slug:slug>/lessons/<slug:lesson_slug>/exam/', views.LessonExamView.as_view(), name='lesson_exam'),
]
