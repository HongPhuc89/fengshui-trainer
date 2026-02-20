from django.urls import path
from . import views

urlpatterns = [
    path('', views.NotificationListView.as_view(), name='notification_list'),
    path('mark-all-read/', views.NotificationMarkAllReadView.as_view(), name='notification_mark_all_read'),
    path('<uuid:id>/mark-read/', views.NotificationMarkReadView.as_view(), name='notification_mark_read'),
]
