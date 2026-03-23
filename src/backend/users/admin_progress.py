from django.db.models import Count, Max, Q


def get_user_video_summary(user_id):
    """
    Return per-course watch progress for a user as a queryset of UserVideoPurchase
    annotated with watched_count, completed_count, last_watched, and total_lessons.

    Uses a single annotate query to avoid N+1.
    """
    from videos.models import UserVideoPurchase

    return (
        UserVideoPurchase.objects
        .filter(user_id=user_id)
        .annotate(
            watched_count=Count(
                'video__lessons__user_progresses',
                filter=Q(video__lessons__user_progresses__user_id=user_id),
                distinct=True,
            ),
            completed_count=Count(
                'video__lessons__user_progresses',
                filter=Q(
                    video__lessons__user_progresses__user_id=user_id,
                    video__lessons__user_progresses__completed=True,
                ),
                distinct=True,
            ),
            last_watched=Max(
                'video__lessons__user_progresses__last_watched',
                filter=Q(video__lessons__user_progresses__user_id=user_id),
            ),
        )
        .select_related('video')
        .order_by('-last_watched')
    )


def get_user_book_summary(user_id):
    """
    Return per-book reading progress for a user as a queryset of UserBookPurchase
    annotated with read_count, completed_count, last_read, and total_chapters.

    Uses a single annotate query to avoid N+1.
    """
    from books.models import UserBookPurchase

    return (
        UserBookPurchase.objects
        .filter(user_id=user_id)
        .annotate(
            read_count=Count(
                'book__chapters__user_progresses',
                filter=Q(book__chapters__user_progresses__user_id=user_id),
                distinct=True,
            ),
            completed_count=Count(
                'book__chapters__user_progresses',
                filter=Q(
                    book__chapters__user_progresses__user_id=user_id,
                    book__chapters__user_progresses__completed=True,
                ),
                distinct=True,
            ),
            last_read=Max(
                'book__chapters__user_progresses__last_read',
                filter=Q(book__chapters__user_progresses__user_id=user_id),
            ),
            total_chapters=Count('book__chapters', distinct=True),
        )
        .select_related('book')
        .order_by('-last_read')
    )
