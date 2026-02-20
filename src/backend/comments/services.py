"""Permission: only purchased users (or VIP) can comment on content."""
from django.contrib.contenttypes.models import ContentType

from books.models import Book, UserBookPurchase
from videos.models import VideoCourse, UserVideoPurchase


def can_comment_on_content(user, content_type_label, object_id):
    """
    content_type_label: 'book' or 'video_course'
    object_id: public_id (UUID string) of the content.
    """
    if not user or not user.is_authenticated:
        return False
    if user.user_type == 'VIP':
        return True
    if content_type_label == 'book':
        try:
            book = Book.objects.get(public_id=object_id)
            return UserBookPurchase.objects.filter(user=user, book=book).exists()
        except (Book.DoesNotExist, ValueError):
            return False
    if content_type_label == 'video_course':
        try:
            course = VideoCourse.objects.get(public_id=object_id)
            return UserVideoPurchase.objects.filter(user=user, video=course).exists()
        except (VideoCourse.DoesNotExist, ValueError):
            return False
    return False


def get_content_type_for_label(label):
    """Return ContentType for 'book' or 'video_course'."""
    from books.models import Book
    from videos.models import VideoCourse
    if label == 'book':
        return ContentType.objects.get_for_model(Book)
    if label == 'video_course':
        return ContentType.objects.get_for_model(VideoCourse)
    return None
