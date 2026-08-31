"""
Chapter access/completion flags on the book detail response.

Regression coverage: BookChapterListSerializer used to omit can_access and
is_completed entirely, so every chapter defaulted to "locked" on the mobile
client (BookChapterMetaModel.fromJson falls back to false) — nobody could
open a chapter from the book detail screen, purchased or not. Mirrors the
identical bug already fixed on VideoLessonListSerializer.
"""

from django.urls import reverse
from rest_framework.test import APITestCase

from users.models import User

from .models import Book, BookChapter, UserBookPurchase, UserChapterProgress

PASSWORD = 'str0ng-pass-word'


def make_book(is_free=False, published=True, slug='ky-mon-am-ban-hoa-giai'):
    from django.utils import timezone

    return Book.objects.create(
        title='Kỳ Môn Âm Bàn Hóa Giải', slug=slug, is_free=is_free,
        published_date=timezone.now().date() if published else None,
    )


def make_chapter(book, order, is_demo=False):
    return BookChapter.objects.create(
        book=book, title=f'Chương {order}', slug=f'chuong-{order}', order=order, is_demo=is_demo,
    )


class ChapterAccessFlagTests(APITestCase):
    def setUp(self):
        self.book = make_book()
        self.demo_chapter = make_chapter(self.book, 1, is_demo=True)
        self.paid_chapter = make_chapter(self.book, 2, is_demo=False)
        self.url = reverse('book_detail', args=[self.book.slug])

    def _chapters_by_order(self, response):
        return {c['order']: c for c in response.data['chapters']}

    def test_anonymous_can_access_only_the_demo_chapter(self):
        response = self.client.get(self.url)
        chapters = self._chapters_by_order(response)
        self.assertTrue(chapters[1]['can_access'])
        self.assertFalse(chapters[2]['can_access'])

    def test_vip_can_access_every_chapter(self):
        user = User.objects.create_user(
            username='vip@example.com', email='vip@example.com',
            password=PASSWORD, is_active=True, user_type='VIP',
        )
        self.client.force_authenticate(user)

        response = self.client.get(self.url)

        chapters = self._chapters_by_order(response)
        self.assertTrue(chapters[1]['can_access'])
        self.assertTrue(chapters[2]['can_access'])

    def test_non_vip_without_purchase_stays_locked_out_of_paid_chapters(self):
        user = User.objects.create_user(
            username='free@example.com', email='free@example.com',
            password=PASSWORD, is_active=True,
        )
        self.client.force_authenticate(user)

        response = self.client.get(self.url)

        chapters = self._chapters_by_order(response)
        self.assertTrue(chapters[1]['can_access'])
        self.assertFalse(chapters[2]['can_access'])

    def test_purchase_unlocks_every_chapter(self):
        user = User.objects.create_user(
            username='buyer@example.com', email='buyer@example.com',
            password=PASSWORD, is_active=True,
        )
        UserBookPurchase.objects.create(user=user, book=self.book)
        self.client.force_authenticate(user)

        response = self.client.get(self.url)

        self.assertTrue(self._chapters_by_order(response)[2]['can_access'])

    def test_free_book_unlocks_every_chapter_even_anonymously(self):
        """book.is_free short-circuits _can_access_chapter regardless of auth."""
        free_book = make_book(is_free=True, slug='free-book')
        chapter = make_chapter(free_book, 1, is_demo=False)
        url = reverse('book_detail', args=[free_book.slug])

        response = self.client.get(url)

        self.assertTrue(self._chapters_by_order(response)[chapter.order]['can_access'])

    def test_completed_chapter_is_flagged_only_for_that_user(self):
        reader = User.objects.create_user(
            username='reader@example.com', email='reader@example.com',
            password=PASSWORD, is_active=True, user_type='VIP',
        )
        other = User.objects.create_user(
            username='other@example.com', email='other@example.com',
            password=PASSWORD, is_active=True, user_type='VIP',
        )
        UserChapterProgress.objects.create(user=reader, chapter=self.demo_chapter, completed=True)
        self.client.force_authenticate(reader)

        response = self.client.get(self.url)
        chapters = self._chapters_by_order(response)
        self.assertTrue(chapters[1]['is_completed'])
        self.assertFalse(chapters[2]['is_completed'])

        self.client.force_authenticate(other)
        response = self.client.get(self.url)
        self.assertFalse(self._chapters_by_order(response)[1]['is_completed'])

    def test_anonymous_response_has_no_completed_chapters(self):
        response = self.client.get(self.url)
        chapters = self._chapters_by_order(response)
        self.assertFalse(chapters[1]['is_completed'])
        self.assertFalse(chapters[2]['is_completed'])
