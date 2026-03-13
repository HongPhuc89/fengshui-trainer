"""
Django Admin custom views — Feature 17: Admin Activity Dashboard.

URL: /admin/stats/activity/
Permission: staff_member_required (is_staff=True), enforced via admin.site.admin_view().
"""
from datetime import date, timedelta

from django.contrib import admin
from django.contrib.admin.views.decorators import staff_member_required
from django.shortcuts import render
from django.utils.decorators import method_decorator
from django.views import View

from .admin_stats import get_activity_stats, get_revenue_stats

MAX_RANGE_DAYS = 365
DEFAULT_RANGE_DAYS = 30


@method_decorator(staff_member_required, name='dispatch')
class ActivityDashboardView(View):
    """
    Server-rendered Django Admin dashboard showing daily activity and Linh Thach economy metrics.
    """
    template_name = 'admin/stats/activity_dashboard.html'

    def get(self, request):
        today = date.today()

        # Parse start_date — fallback to last 30 days if missing or invalid
        try:
            start_date = date.fromisoformat(request.GET.get('start_date', ''))
        except (ValueError, TypeError):
            start_date = today - timedelta(days=DEFAULT_RANGE_DAYS - 1)

        # Parse end_date — fallback to today if missing or invalid
        try:
            end_date = date.fromisoformat(request.GET.get('end_date', ''))
        except (ValueError, TypeError):
            end_date = today

        # Swap if reversed
        if end_date < start_date:
            start_date, end_date = end_date, start_date

        # Cap at max range
        if (end_date - start_date).days > MAX_RANGE_DAYS:
            start_date = end_date - timedelta(days=MAX_RANGE_DAYS)

        activity = get_activity_stats(start_date, end_date)
        revenue = get_revenue_stats(start_date, end_date)

        context = {
            **admin.site.each_context(request),
            'title': 'Thống kê hoạt động',
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            # Preset anchors (keep end_date as-is, shift start back)
            'preset_7_start': (end_date - timedelta(days=6)).isoformat(),
            'preset_30_start': (end_date - timedelta(days=29)).isoformat(),
            'preset_90_start': (end_date - timedelta(days=89)).isoformat(),
            'activity_summary': activity['summary'],
            'revenue_summary': revenue['summary'],
            'daily_rows': _merge_daily(activity['daily'], revenue['daily']),
        }
        return render(request, self.template_name, context)


def _merge_daily(activity_daily, revenue_daily):
    """
    Merge activity and revenue daily lists by date into a single list for the table.
    Rows are sorted newest-first.
    """
    rev_map = {r['date']: r for r in revenue_daily}
    act_map = {r['date']: r for r in activity_daily}
    all_days = sorted(set(act_map) | set(rev_map), reverse=True)
    rows = []
    for day in all_days:
        act = act_map.get(day, {})
        rev = rev_map.get(day, {})
        rows.append({
            'date': day,
            'dau': act.get('dau', 0),
            'new_registrations': act.get('new_registrations', 0),
            'new_purchases': act.get('new_purchases', 0),
            'lt_recharged': rev.get('lt_recharged', 0),
            'lt_spent': rev.get('lt_spent', 0),
            'vouchers_redeemed': rev.get('vouchers_redeemed', 0),
            'book_spend': rev.get('breakdown', {}).get('purchase_book', 0),
            'video_spend': rev.get('breakdown', {}).get('purchase_video', 0),
            'vip_spend': rev.get('breakdown', {}).get('vip_subscription', 0),
        })
    return rows
