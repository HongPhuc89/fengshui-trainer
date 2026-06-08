from rest_framework import serializers

from .models import BookIntroPage


class BookIntroPageSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookIntroPage
        fields = ['tag_label', 'headline', 'chapters', 'sidebar_qr_image', 'sidebar_zalo_url']
