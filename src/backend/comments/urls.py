from django.urls import path
from . import views

urlpatterns = [
    path('', views.CommentListView.as_view(), name='comment_list'),
    path('create/', views.CommentCreateView.as_view(), name='comment_create'),  # POST /api/comments/create/
    path('<uuid:id>/reply/', views.CommentReplyView.as_view(), name='comment_reply'),
    path('<uuid:id>/', views.CommentDeleteView.as_view(), name='comment_delete'),
]
