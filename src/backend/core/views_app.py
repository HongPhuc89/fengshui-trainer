"""Mobile app version endpoint (feature-37 §5.2). Android only — iOS updates
through TestFlight and never call into this app."""

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AppRelease
from .serializers import AppReleaseSerializer


class AppVersionView(APIView):
    """
    GET /api/app/version/

    AllowAny on purpose: the app checks its version before the user logs in,
    so it has no token to send yet (feature-36 §4.4, carried over unchanged).

    No query params: there is only one platform and the server no longer
    computes a verdict — the client compares version_code itself.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        release = AppRelease.current()
        if release is None or not release.file:
            # Nothing published yet — the client treats this as up to date.
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(AppReleaseSerializer(release, context={'request': request}).data)
