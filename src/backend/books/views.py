from django.conf import settings
from django.http import FileResponse, Http404
from rest_framework import generics, status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from .models import BookCategory, Book, BookChapter, UserBookPurchase
from .serializers import (
    BookCategorySerializer, BookListSerializer, BookDetailSerializer,
    BookDetailWithPurchaseSerializer, BookChapterListSerializer,
    WatermarkConfigSerializer,
)


def _can_access_chapter(user, book, chapter):
    """VIP or purchased or demo chapter -> True."""
    if not user or not user.is_authenticated:
        return chapter.is_demo
    if user.user_type == 'VIP':
        return True
    if UserBookPurchase.objects.filter(user=user, book=book).exists():
        return True
    return chapter.is_demo


class BookCategoryListView(generics.ListAPIView):
    """GET /api/books/categories/ - List categories."""
    permission_classes = (AllowAny,)
    serializer_class = BookCategorySerializer
    queryset = BookCategory.objects.all().order_by('title')


class BookListView(generics.ListAPIView):
    """GET /api/books/ - List books with filters."""
    permission_classes = (AllowAny,)
    serializer_class = BookListSerializer
    queryset = Book.objects.all().select_related('category')

    def get_queryset(self):
        qs = Book.objects.all().select_related('category')
        category_slug = self.request.query_params.get('category')
        if category_slug:
            qs = qs.filter(category__slug=category_slug)
        if self.request.query_params.get('is_new_release') == 'true':
            qs = qs.filter(is_new_release=True)
        if self.request.query_params.get('is_free') == 'true':
            qs = qs.filter(is_free=True)
        search = self.request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(title__icontains=search) | qs.filter(author__icontains=search)
        return qs.order_by('-created_at')


class BookDetailView(generics.RetrieveAPIView):
    """GET /api/books/{slug}/ - Book detail with chapters; has_purchased if auth."""
    permission_classes = (AllowAny,)
    queryset = Book.objects.all().select_related('category').prefetch_related('chapters')
    lookup_field = 'slug'
    lookup_url_kwarg = 'slug'

    def get_serializer_class(self):
        if self.request.user.is_authenticated:
            return BookDetailWithPurchaseSerializer
        return BookDetailSerializer


class BookChapterDetailView(views.APIView):
    """GET /api/books/{slug}/chapters/{order}/ - Chapter content (URL or 403)."""
    permission_classes = (IsAuthenticated,)

    def get(self, request, slug, order):
        try:
            book = Book.objects.get(slug=slug)
            chapter = BookChapter.objects.get(book=book, order=order)
        except (Book.DoesNotExist, BookChapter.DoesNotExist):
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not _can_access_chapter(request.user, book, chapter):
            return Response(
                {'detail': 'Access denied. Purchase book or upgrade to VIP.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Return file URL or path for client to load (e.g. signed URL or media path)
        import os
        if chapter.file_path and os.path.isabs(chapter.file_path):
            file_url = chapter.file_path
        else:
            file_url = request.build_absolute_uri(settings.MEDIA_URL + chapter.file_path) if chapter.file_path else None

        return Response({
            'public_id': str(chapter.public_id),
            'title': chapter.title,
            'order': chapter.order,
            'file_url': file_url,
            'file_path': chapter.file_path,
            'page_count': chapter.page_count,
        })


class BookChapterWatermarkConfigView(views.APIView):
    """GET /api/books/{slug}/chapters/{order}/watermark-config/ - Watermark for client overlay."""
    permission_classes = (IsAuthenticated,)

    def get(self, request, slug, order):
        try:
            book = Book.objects.get(slug=slug)
            chapter = BookChapter.objects.get(book=book, order=order)
        except (Book.DoesNotExist, BookChapter.DoesNotExist):
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not _can_access_chapter(request.user, book, chapter):
            return Response({'detail': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)

        name = (request.user.get_full_name() or request.user.username or '').strip() or 'User'
        phone = (request.user.phone_number or '').strip()
        return Response(WatermarkConfigSerializer({
            'display_name': name,
            'phone_number': phone,
        }).data)
