from django.urls import path

from .views import BookIntroPageView

urlpatterns = [
    path('book-intro/', BookIntroPageView.as_view(), name='book-intro-page'),
]
