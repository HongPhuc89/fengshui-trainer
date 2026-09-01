from rest_framework import serializers

from .models import AppRelease


class AppReleaseSerializer(serializers.ModelSerializer):
    """GET /api/app/version/ response shape (feature-37 §5.2)."""

    class Meta:
        model = AppRelease
        fields = ['version_code', 'version_name', 'release_notes',
                  'download_url', 'file_size', 'sha256']
