from django.urls import path
from . import views_payments

urlpatterns = [
    path('purchase-book/', views_payments.PurchaseBookView.as_view(), name='payment_purchase_book'),
    path('purchase-video/', views_payments.PurchaseVideoView.as_view(), name='payment_purchase_video'),
    path('subscribe-vip/', views_payments.SubscribeVipView.as_view(), name='payment_subscribe_vip'),
]
