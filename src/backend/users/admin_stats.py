"""
Admin stats query functions — Feature 17: Admin Activity Dashboard.

These functions are intentionally thin wrappers around Django ORM queries.
They import models inside function bodies to avoid circular imports at module load time.
"""
from collections import defaultdict
from datetime import date

from zoneinfo import ZoneInfo

from django.db.models import Count, Sum
from django.db.models.functions import TruncDate

VN_TZ = ZoneInfo('Asia/Ho_Chi_Minh')


def get_activity_stats(start_date: date, end_date: date) -> dict:
    """
    Returns DAU, new registrations, and new purchases per day plus summary totals.

    DAU = unique users who watched at least one lesson OR read at least one chapter.
    Purchases = UserBookPurchase + UserVideoPurchase combined.
    """
    from videos.models import UserLessonProgress, UserVideoPurchase
    from books.models import UserChapterProgress, UserBookPurchase
    from django.contrib.auth import get_user_model

    User = get_user_model()

    # --- DAU: unique (day, user_id) pairs from lesson + chapter activity ---
    lesson_pairs = set(
        UserLessonProgress.objects
        .filter(last_watched__date__range=(start_date, end_date))
        .annotate(day=TruncDate('last_watched', tzinfo=VN_TZ))
        .values_list('day', 'user_id')
        .distinct()
    )
    chapter_pairs = set(
        UserChapterProgress.objects
        .filter(last_read__date__range=(start_date, end_date))
        .annotate(day=TruncDate('last_read', tzinfo=VN_TZ))
        .values_list('day', 'user_id')
        .distinct()
    )
    all_pairs = lesson_pairs | chapter_pairs
    dau_per_day = defaultdict(set)
    for day, user_id in all_pairs:
        dau_per_day[day].add(user_id)

    # --- New registrations per day ---
    reg_qs = (
        User.objects
        .filter(created_at__date__range=(start_date, end_date))
        .annotate(day=TruncDate('created_at', tzinfo=VN_TZ))
        .values('day')
        .annotate(count=Count('id'))
    )
    reg_per_day = {row['day']: row['count'] for row in reg_qs}

    # --- New purchases per day (books + videos, both use created_at via BaseModel) ---
    book_qs = (
        UserBookPurchase.objects
        .filter(created_at__date__range=(start_date, end_date))
        .annotate(day=TruncDate('created_at', tzinfo=VN_TZ))
        .values('day')
        .annotate(count=Count('id'))
    )
    video_qs = (
        UserVideoPurchase.objects
        .filter(created_at__date__range=(start_date, end_date))
        .annotate(day=TruncDate('created_at', tzinfo=VN_TZ))
        .values('day')
        .annotate(count=Count('id'))
    )
    purchase_per_day = defaultdict(int)
    for row in book_qs:
        purchase_per_day[row['day']] += row['count']
    for row in video_qs:
        purchase_per_day[row['day']] += row['count']

    # --- Build daily list (only days with at least one data point) ---
    all_days = sorted(set(dau_per_day) | set(reg_per_day) | set(purchase_per_day))
    daily = []
    for day in all_days:
        daily.append({
            'date': day,
            'dau': len(dau_per_day.get(day, set())),
            'new_registrations': reg_per_day.get(day, 0),
            'new_purchases': purchase_per_day.get(day, 0),
        })

    return {
        'daily': daily,
        'summary': {
            'total_dau': sum(r['dau'] for r in daily),
            'total_registrations': sum(r['new_registrations'] for r in daily),
            'total_purchases': sum(r['new_purchases'] for r in daily),
        },
    }


def get_revenue_stats(start_date: date, end_date: date) -> dict:
    """
    Returns LT recharged, LT spent, vouchers redeemed, and breakdown by content type per day,
    plus summary totals.

    LT recharged = RECHARGE_VOUCHER + ADMIN_TOPUP transactions (amount > 0).
    LT spent = all transactions with amount < 0 (abs value reported).
    Revenue breakdown = PURCHASE_BOOK / PURCHASE_VIDEO / VIP_SUBSCRIPTION (abs value).
    """
    from wallet.models import WalletTransaction, Voucher

    # --- LT recharged per day ---
    recharged_qs = (
        WalletTransaction.objects
        .filter(
            created_at__date__range=(start_date, end_date),
            transaction_type__in=['RECHARGE_VOUCHER', 'ADMIN_TOPUP'],
        )
        .annotate(day=TruncDate('created_at', tzinfo=VN_TZ))
        .values('day')
        .annotate(total=Sum('amount'))
    )
    recharged_per_day = {row['day']: row['total'] or 0 for row in recharged_qs}

    # --- LT spent per day (all negative transactions, returned as abs value) ---
    spent_qs = (
        WalletTransaction.objects
        .filter(
            created_at__date__range=(start_date, end_date),
            amount__lt=0,
        )
        .annotate(day=TruncDate('created_at', tzinfo=VN_TZ))
        .values('day')
        .annotate(total=Sum('amount'))
    )
    spent_per_day = {row['day']: abs(row['total'] or 0) for row in spent_qs}

    # --- Vouchers redeemed per day ---
    voucher_qs = (
        Voucher.objects
        .filter(
            used_at__date__range=(start_date, end_date),
            is_used=True,
        )
        .annotate(day=TruncDate('used_at', tzinfo=VN_TZ))
        .values('day')
        .annotate(count=Count('id'))
    )
    voucher_per_day = {row['day']: row['count'] for row in voucher_qs}

    # --- Revenue breakdown per day by content type ---
    breakdown_qs = (
        WalletTransaction.objects
        .filter(
            created_at__date__range=(start_date, end_date),
            transaction_type__in=['PURCHASE_BOOK', 'PURCHASE_VIDEO', 'VIP_SUBSCRIPTION'],
            amount__lt=0,
        )
        .annotate(day=TruncDate('created_at', tzinfo=VN_TZ))
        .values('day', 'transaction_type')
        .annotate(total=Sum('amount'))
    )
    breakdown_per_day = defaultdict(lambda: {'purchase_book': 0, 'purchase_video': 0, 'vip_subscription': 0})
    for row in breakdown_qs:
        key = row['transaction_type'].lower()
        breakdown_per_day[row['day']][key] = abs(row['total'] or 0)

    # --- Build daily list ---
    all_days = sorted(
        set(recharged_per_day) | set(spent_per_day) | set(voucher_per_day) | set(breakdown_per_day)
    )
    daily = []
    for day in all_days:
        daily.append({
            'date': day,
            'lt_recharged': recharged_per_day.get(day, 0),
            'lt_spent': spent_per_day.get(day, 0),
            'vouchers_redeemed': voucher_per_day.get(day, 0),
            'breakdown': breakdown_per_day.get(
                day,
                {'purchase_book': 0, 'purchase_video': 0, 'vip_subscription': 0},
            ),
        })

    return {
        'daily': daily,
        'summary': {
            'total_lt_recharged': sum(r['lt_recharged'] for r in daily),
            'total_lt_spent': sum(r['lt_spent'] for r in daily),
            'total_vouchers_redeemed': sum(r['vouchers_redeemed'] for r in daily),
        },
    }
