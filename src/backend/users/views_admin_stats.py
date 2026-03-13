"""
Admin Stats API views — Feature 17: Admin Activity Dashboard.

Endpoints:
  GET /api/admin/stats/activity/   — DailyActivityStatsView
  GET /api/admin/stats/revenue/    — DailyRevenueStatsView

Permission: IsAdminUser (is_staff=True required)
"""
from collections import defaultdict
from datetime import date, timedelta

from zoneinfo import ZoneInfo

from django.contrib.auth import get_user_model
from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from books.models import UserBookPurchase, UserChapterProgress
from videos.models import UserLessonProgress, UserVideoPurchase
from wallet.models import WalletTransaction, Voucher

User = get_user_model()
VN_TZ = ZoneInfo('Asia/Ho_Chi_Minh')

MAX_RANGE_DAYS = 365
DEFAULT_RANGE_DAYS = 30


def _parse_date_params(request):
    """
    Parse and validate start_date / end_date query params.
    Defaults to last 30 days if not provided.
    Returns (start_date, end_date, error_response_or_None).
    """
    today = date.today()
    raw_start = request.query_params.get('start_date')
    raw_end = request.query_params.get('end_date')

    if raw_start and raw_end:
        try:
            start = date.fromisoformat(raw_start)
            end = date.fromisoformat(raw_end)
        except ValueError:
            return None, None, Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD.'},
                status=400,
            )
        if end < start:
            return None, None, Response(
                {'error': 'end_date must be >= start_date.'},
                status=400,
            )
        if (end - start).days > MAX_RANGE_DAYS:
            return None, None, Response(
                {'error': f'Date range cannot exceed {MAX_RANGE_DAYS} days.'},
                status=400,
            )
    else:
        end = today
        start = today - timedelta(days=DEFAULT_RANGE_DAYS - 1)

    return start, end, None


def _date_range_list(start, end):
    """Return list of date objects from start to end (inclusive)."""
    result = []
    current = start
    while current <= end:
        result.append(current)
        current += timedelta(days=1)
    return result


class DailyActivityStatsView(APIView):
    """
    GET /api/admin/stats/activity/

    Returns daily DAU, new registrations, new purchases for a date range.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        start, end, err = _parse_date_params(request)
        if err:
            return err

        # --- DAU: unique users who watched a lesson OR read a chapter ---
        lesson_dau_qs = (
            UserLessonProgress.objects
            .filter(last_watched__date__range=(start, end))
            .annotate(day=TruncDate('last_watched', tzinfo=VN_TZ))
            .values('day', 'user_id')
            .distinct()
        )
        chapter_dau_qs = (
            UserChapterProgress.objects
            .filter(last_read__date__range=(start, end))
            .annotate(day=TruncDate('last_read', tzinfo=VN_TZ))
            .values('day', 'user_id')
            .distinct()
        )

        # Merge in Python: deduplicate (day, user_id) pairs, count per day
        dau_pairs = set()
        for row in lesson_dau_qs:
            dau_pairs.add((row['day'], row['user_id']))
        for row in chapter_dau_qs:
            dau_pairs.add((row['day'], row['user_id']))

        dau_by_day = defaultdict(int)
        for day, _ in dau_pairs:
            dau_by_day[day] += 1

        # --- New registrations per day ---
        reg_qs = (
            User.objects
            .filter(created_at__date__range=(start, end))
            .annotate(day=TruncDate('created_at', tzinfo=VN_TZ))
            .values('day')
            .annotate(count=Count('id'))
        )
        reg_by_day = {row['day']: row['count'] for row in reg_qs}

        # --- New purchases per day (book + video merged) ---
        book_pur_qs = (
            UserBookPurchase.objects
            .filter(created_at__date__range=(start, end))
            .annotate(day=TruncDate('created_at', tzinfo=VN_TZ))
            .values('day')
            .annotate(count=Count('id'))
        )
        video_pur_qs = (
            UserVideoPurchase.objects
            .filter(created_at__date__range=(start, end))
            .annotate(day=TruncDate('created_at', tzinfo=VN_TZ))
            .values('day')
            .annotate(count=Count('id'))
        )
        pur_by_day = defaultdict(int)
        for row in book_pur_qs:
            pur_by_day[row['day']] += row['count']
        for row in video_pur_qs:
            pur_by_day[row['day']] += row['count']

        # --- Build daily array ---
        all_dates = _date_range_list(start, end)
        daily = []
        for d in all_dates:
            daily.append({
                'date': d.isoformat(),
                'dau': dau_by_day.get(d, 0),
                'new_registrations': reg_by_day.get(d, 0),
                'new_purchases': pur_by_day.get(d, 0),
            })

        summary = {
            'total_dau': sum(dau_by_day.values()),
            'total_registrations': sum(reg_by_day.values()),
            'total_purchases': sum(v for v in pur_by_day.values()),
        }

        return Response({
            'period': {
                'start_date': start.isoformat(),
                'end_date': end.isoformat(),
            },
            'summary': summary,
            'daily': daily,
        })


class DailyRevenueStatsView(APIView):
    """
    GET /api/admin/stats/revenue/

    Returns daily LT recharged, LT spent, vouchers redeemed,
    and revenue breakdown by content type.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        start, end, err = _parse_date_params(request)
        if err:
            return err

        # --- LT recharged per day (RECHARGE_VOUCHER + ADMIN_TOPUP) ---
        lt_recharged_qs = (
            WalletTransaction.objects
            .filter(
                created_at__date__range=(start, end),
                transaction_type__in=['RECHARGE_VOUCHER', 'ADMIN_TOPUP'],
            )
            .annotate(day=TruncDate('created_at', tzinfo=VN_TZ))
            .values('day')
            .annotate(total=Sum('amount'))
        )
        lt_recharged_by_day = {row['day']: row['total'] or 0 for row in lt_recharged_qs}

        # --- LT spent per day (amount < 0, return abs value) ---
        lt_spent_qs = (
            WalletTransaction.objects
            .filter(
                created_at__date__range=(start, end),
                amount__lt=0,
            )
            .annotate(day=TruncDate('created_at', tzinfo=VN_TZ))
            .values('day')
            .annotate(total=Sum('amount'))
        )
        lt_spent_by_day = {row['day']: abs(row['total'] or 0) for row in lt_spent_qs}

        # --- Vouchers redeemed per day ---
        voucher_qs = (
            Voucher.objects
            .filter(
                used_at__date__range=(start, end),
                is_used=True,
            )
            .annotate(day=TruncDate('used_at', tzinfo=VN_TZ))
            .values('day')
            .annotate(count=Count('id'))
        )
        vouchers_by_day = {row['day']: row['count'] for row in voucher_qs}

        # --- Revenue breakdown per day per type ---
        breakdown_qs = (
            WalletTransaction.objects
            .filter(
                created_at__date__range=(start, end),
                transaction_type__in=['PURCHASE_BOOK', 'PURCHASE_VIDEO', 'VIP_SUBSCRIPTION'],
                amount__lt=0,
            )
            .annotate(day=TruncDate('created_at', tzinfo=VN_TZ))
            .values('day', 'transaction_type')
            .annotate(total=Sum('amount'))
        )
        # breakdown_by_day: {date: {type: abs_amount}}
        breakdown_by_day = defaultdict(lambda: defaultdict(int))
        for row in breakdown_qs:
            breakdown_by_day[row['day']][row['transaction_type']] = abs(row['total'] or 0)

        # --- Build daily array ---
        all_dates = _date_range_list(start, end)
        daily = []
        for d in all_dates:
            bd = breakdown_by_day.get(d, {})
            daily.append({
                'date': d.isoformat(),
                'lt_recharged': lt_recharged_by_day.get(d, 0),
                'lt_spent': lt_spent_by_day.get(d, 0),
                'vouchers_redeemed': vouchers_by_day.get(d, 0),
                'breakdown': {
                    'purchase_book': bd.get('PURCHASE_BOOK', 0),
                    'purchase_video': bd.get('PURCHASE_VIDEO', 0),
                    'vip_subscription': bd.get('VIP_SUBSCRIPTION', 0),
                },
            })

        summary = {
            'total_lt_recharged': sum(lt_recharged_by_day.values()),
            'total_lt_spent': sum(lt_spent_by_day.values()),
            'total_vouchers_redeemed': sum(vouchers_by_day.values()),
        }

        return Response({
            'period': {
                'start_date': start.isoformat(),
                'end_date': end.isoformat(),
            },
            'summary': summary,
            'daily': daily,
        })
