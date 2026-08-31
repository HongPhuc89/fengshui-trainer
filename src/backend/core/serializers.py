from rest_framework import serializers

from .models import AppRelease


class AppReleaseSerializer(serializers.ModelSerializer):
    """GET /api/app/version/ response shape (feature-37 §5.2)."""

    download_url = serializers.SerializerMethodField()

    class Meta:
        model = AppRelease
        fields = ['version_code', 'version_name', 'release_notes',
                  'download_url', 'file_size', 'sha256']

    def get_download_url(self, obj) -> str | None:
        if not obj.file:
            return None
        request = self.context.get('request')
        url = obj.file.url
        return request.build_absolute_uri(url) if request else url
