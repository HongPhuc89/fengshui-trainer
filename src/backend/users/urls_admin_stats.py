"""
URL patterns for admin stats endpoints — Feature 17.
Registered under: /api/admin/stats/
"""
from django.urls import path
from .views_admin_stats import DailyActivityStatsView, DailyRevenueStatsView

urlpatterns = [
    path('activity/', DailyActivityStatsView.as_view(), name='admin-stats-activity'),
    path('revenue/', DailyRevenueStatsView.as_view(), name='admin-stats-revenue'),
]
