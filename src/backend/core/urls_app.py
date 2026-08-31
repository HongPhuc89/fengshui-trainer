from django.urls import path

from .views_app import AppVersionView

urlpatterns = [
    path('version/', AppVersionView.as_view(), name='app_version'),
]
