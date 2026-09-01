"""
Lesson access/completion flags on the course detail response.

Regression coverage: VideoLessonListSerializer used to omit can_access and
is_completed entirely, so every lesson defaulted to "locked" on the mobile
client (LessonMetaModel.fromJson falls back to false) — nobody could tap into
a lesson from the course detail screen, VIP or not.
"""

from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from users.models import User

from .models import UserLessonProgress, UserVideoPurchase, VideoCourse, VideoLesson
from .serializers import _is_new_release

PASSWORD = 'str0ng-pass-word'


def make_course(is_free=False, published=True):
    return VideoCourse.objects.create(
        title='Kỳ Môn Độn Giáp', slug='ky-mon-don-giap', is_free=is_free,
        published_date=timezone.now().date() if published else None,
    )


def make_lesson(course, order, is_free=False):
    return VideoLesson.objects.create(
        course=course, title=f'Bài {order}', slug=f'bai-{order}', order=order, is_free=is_free,
    )


class LessonAccessFlagTests(APITestCase):
    def setUp(self):
        self.course = make_course()
        self.free_lesson = make_lesson(self.course, 1, is_free=True)
        self.paid_lesson = make_lesson(self.course, 2, is_free=False)
        self.url = reverse('video_course_detail', args=[self.course.slug])

    def _lessons_by_slug(self, response):
        return {lesson['slug']: lesson for lesson in response.data['lessons']}

    def test_anonymous_can_access_only_the_free_lesson(self):
        response = self.client.get(self.url)
        lessons = self._lessons_by_slug(response)
        self.assertTrue(lessons['bai-1']['can_access'])
        self.assertFalse(lessons['bai-2']['can_access'])

    def test_vip_can_access_every_lesson(self):
        user = User.objects.create_user(
            username='vip@example.com', email='vip@example.com',
            password=PASSWORD, is_active=True, user_type='VIP',
        )
        self.client.force_authenticate(user)

        response = self.client.get(self.url)

        lessons = self._lessons_by_slug(response)
        self.assertTrue(lessons['bai-1']['can_access'])
        self.assertTrue(lessons['bai-2']['can_access'])

    def test_non_vip_without_purchase_stays_locked_out_of_paid_lessons(self):
        user = User.objects.create_user(
            username='free@example.com', email='free@example.com',
            password=PASSWORD, is_active=True,
        )
        self.client.force_authenticate(user)

        response = self.client.get(self.url)

        lessons = self._lessons_by_slug(response)
        self.assertTrue(lessons['bai-1']['can_access'])
        self.assertFalse(lessons['bai-2']['can_access'])

    def test_purchase_unlocks_every_lesson(self):
        user = User.objects.create_user(
            username='buyer@example.com', email='buyer@example.com',
            password=PASSWORD, is_active=True,
        )
        UserVideoPurchase.objects.create(user=user, video=self.course)
        self.client.force_authenticate(user)

        response = self.client.get(self.url)

        self.assertTrue(self._lessons_by_slug(response)['bai-2']['can_access'])

    def test_completed_lesson_is_flagged_only_for_that_user(self):
        watcher = User.objects.create_user(
            username='watcher@example.com', email='watcher@example.com',
            password=PASSWORD, is_active=True, user_type='VIP',
        )
        other = User.objects.create_user(
            username='other@example.com', email='other@example.com',
            password=PASSWORD, is_active=True, user_type='VIP',
        )
        UserLessonProgress.objects.create(user=watcher, lesson=self.free_lesson, completed=True)
        self.client.force_authenticate(watcher)

        response = self.client.get(self.url)
        lessons = self._lessons_by_slug(response)
        self.assertTrue(lessons['bai-1']['is_completed'])
        self.assertFalse(lessons['bai-2']['is_completed'])

        self.client.force_authenticate(other)
        response = self.client.get(self.url)
        self.assertFalse(self._lessons_by_slug(response)['bai-1']['is_completed'])

    def test_anonymous_response_has_no_completed_lessons(self):
        response = self.client.get(self.url)
        lessons = self._lessons_by_slug(response)
        self.assertFalse(lessons['bai-1']['is_completed'])
        self.assertFalse(lessons['bai-2']['is_completed'])


class NewReleaseFlagTests(APITestCase):
    """
    is_new_release is a rolling 30-day window off published_date, not an
    admin-set field — nothing to leave stale once a course ages out.
    """

    def _course(self, published_date, slug):
        return VideoCourse.objects.create(
            title='Course', slug=slug, published_date=published_date,
        )

    def test_published_today_is_new(self):
        course = self._course(timezone.now().date(), 'fresh')
        url = reverse('video_course_detail', args=[course.slug])
        self.assertTrue(self.client.get(url).data['is_new_release'])

    def test_published_31_days_ago_is_not_new(self):
        course = self._course(timezone.now().date() - timedelta(days=31), 'stale')
        url = reverse('video_course_detail', args=[course.slug])
        self.assertFalse(self.client.get(url).data['is_new_release'])

    def test_published_exactly_30_days_ago_is_still_new(self):
        course = self._course(timezone.now().date() - timedelta(days=30), 'boundary')
        url = reverse('video_course_detail', args=[course.slug])
        self.assertTrue(self.client.get(url).data['is_new_release'])

    def test_unpublished_course_is_not_new(self):
        # published_date=None courses are excluded from the list/detail
        # querysets anyway (published_date__lte=today), but the flag itself
        # must not blow up on a null date.
        self.assertFalse(_is_new_release(None))

    def test_new_release_flag_present_on_course_list_too(self):
        self._course(timezone.now().date(), 'fresh-list')
        response = self.client.get(reverse('video_course_list'))
        matching = next(c for c in response.data if c['slug'] == 'fresh-list')
        self.assertTrue(matching['is_new_release'])
