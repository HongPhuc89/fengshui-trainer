"""
Purchase endpoints accept the slug the mobile client actually sends.

Regression coverage: PurchaseBookView/PurchaseVideoView only ever read
book_id/video_id (a public_id UUID) from the request body, but the mobile
detail screens only ever carry a slug through their whole call chain
(purchaseBook(slug)/purchaseVideo(slug) send book_slug/video_slug) — every
purchase attempt through the app failed with 400 before this fix.
"""

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from books.models import Book, UserBookPurchase
from users.models import User
from videos.models import UserVideoPurchase, VideoCourse

PASSWORD = 'str0ng-pass-word'


class PurchaseBookBySlugTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='buyer@example.com', email='buyer@example.com',
            password=PASSWORD, is_active=True,
        )
        self.client.force_authenticate(self.user)
        self.book = Book.objects.create(
            title='Free Book', slug='free-book', is_free=True,
        )

    def test_purchase_by_slug_succeeds(self):
        response = self.client.post(
            reverse('payment_purchase_book'), {'book_slug': self.book.slug},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(
            UserBookPurchase.objects.filter(user=self.user, book=self.book).exists()
        )

    def test_neither_id_nor_slug_is_a_400(self):
        response = self.client.post(reverse('payment_purchase_book'), {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class PurchaseVideoBySlugTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='buyer2@example.com', email='buyer2@example.com',
            password=PASSWORD, is_active=True,
        )
        self.client.force_authenticate(self.user)
        self.course = VideoCourse.objects.create(
            title='Free Course', slug='free-course', is_free=True,
        )

    def test_purchase_by_slug_succeeds(self):
        response = self.client.post(
            reverse('payment_purchase_video'), {'video_slug': self.course.slug},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(
            UserVideoPurchase.objects.filter(user=self.user, video=self.course).exists()
        )
