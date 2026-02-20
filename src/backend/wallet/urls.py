from django.urls import path
from . import views

urlpatterns = [
    path('me/', views.WalletMeView.as_view(), name='wallet_me'),
    path('redeem/', views.RedeemView.as_view(), name='wallet_redeem'),
    path('history/', views.WalletHistoryView.as_view(), name='wallet_history'),
]
