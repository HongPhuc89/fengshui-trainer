from django.urls import path

from .views_app import AppVersionView, ios_manifest

urlpatterns = [
    path('version/', AppVersionView.as_view(), name='app_version'),
    path('ios/manifest.plist', ios_manifest, name='app_ios_manifest'),
]
