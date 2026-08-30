"""Mobile app version and OTA install endpoints (feature-36 §6.1, §6.2)."""

from django.shortcuts import get_object_or_404
from django.template.loader import render_to_string
from django.http import HttpResponse
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AppRelease
from .services.app_version import (
    PLATFORM_BY_PARAM, parse_version_code, resolve_status,
)

IOS_BUNDLE_ID = 'pro.huyenhoc.app'
IOS_APP_TITLE = 'Huyền Học'


class AppVersionView(APIView):
    """
    GET /api/app/version/?platform=android&version_code=7

    AllowAny on purpose: the app checks its version before the user logs in, so
    it has no token to send. Requiring auth would leave the block screen unable
    to fetch the download link it exists to offer (feature-36 §4.4).
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        platform = PLATFORM_BY_PARAM.get((request.query_params.get('platform') or '').lower())
        if platform is None:
            return Response({'detail': 'platform không hợp lệ.'},
                            status=status.HTTP_400_BAD_REQUEST)

        release = AppRelease.current_for(platform)
        if release is None:
            # Nothing published yet — the client treats this as up to date, so
            # turning the feature on disturbs nobody.
            return Response(status=status.HTTP_204_NO_CONTENT)

        client_code = parse_version_code(request.query_params.get('version_code'))
        return Response({
            'platform': release.platform,
            'version_code': release.version_code,
            'version_name': release.version_name,
            'min_supported_version_code': release.min_supported_version_code,
            'update_status': resolve_status(release, client_code),
            'release_notes': release.release_notes,
            'download_url': self._download_url(request, release),
            'file_size': release.file_size if release.platform == AppRelease.PLATFORM_ANDROID else None,
            'sha256': release.sha256 if release.platform == AppRelease.PLATFORM_ANDROID else None,
        })

    @staticmethod
    def _download_url(request, release):
        """Android downloads the APK itself; iOS hands the job to the OS."""
        if release.platform == AppRelease.PLATFORM_ANDROID:
            return request.build_absolute_uri(release.file.url)
        manifest = request.build_absolute_uri('/api/app/ios/manifest.plist')
        return f'itms-services://?action=download-manifest&url={manifest}'


def ios_manifest(request):
    """
    GET /api/app/ios/manifest.plist

    iOS itself fetches this, not the app, so it can carry no Authorization
    header. The IPA URL is signed per request: baking a presigned URL into a
    stored plist would leave the manifest dead an hour later (feature-36 §4.3).
    """
    release = get_object_or_404(
        AppRelease.objects.filter(platform=AppRelease.PLATFORM_IOS, is_published=True)
        .order_by('-version_code')[:1]
    )
    xml = render_to_string('app/manifest.plist', {
        'ipa_url': request.build_absolute_uri(release.file.url),
        'bundle_id': IOS_BUNDLE_ID,
        'version_name': release.version_name,
        'title': IOS_APP_TITLE,
    })
    return HttpResponse(xml, content_type='text/xml')
