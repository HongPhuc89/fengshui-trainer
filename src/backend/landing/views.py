from rest_framework import generics
from rest_framework.permissions import AllowAny

from .models import BookIntroPage
from .serializers import BookIntroPageSerializer


class BookIntroPageView(generics.RetrieveAPIView):
    serializer_class = BookIntroPageSerializer
    permission_classes = [AllowAny]

    def get_object(self):
        from django.shortcuts import get_object_or_404
        return get_object_or_404(BookIntroPage, is_active=True)
