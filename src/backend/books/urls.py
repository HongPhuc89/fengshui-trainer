from django.urls import path
from . import views

urlpatterns = [
    path('categories/', views.BookCategoryListView.as_view(), name='book_category_list'),
    path('recently-read/', views.RecentlyReadBooksView.as_view(), name='recently_read_books'),
    path('', views.BookListView.as_view(), name='book_list'),
    path('<slug:slug>/', views.BookDetailView.as_view(), name='book_detail'),
    path('<slug:slug>/progress/', views.BookReadingProgressView.as_view(), name='book_reading_progress'),
    path('<slug:slug>/chapters/<int:order>/', views.BookChapterDetailView.as_view(), name='book_chapter_detail'),
    path('<slug:slug>/chapters/<int:order>/progress/', views.BookChapterProgressUpdateView.as_view(), name='book_chapter_progress_update'),
    path('<slug:slug>/chapters/<int:order>/watermark-config/', views.BookChapterWatermarkConfigView.as_view(), name='book_chapter_watermark_config'),
]
