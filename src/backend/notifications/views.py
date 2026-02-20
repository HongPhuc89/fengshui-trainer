from rest_framework import generics, status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination

from .models import Notification
from .serializers import NotificationSerializer


class NotificationPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class NotificationListView(generics.ListAPIView):
    """GET /api/notifications/ - List current user's notifications (paginated)."""
    permission_classes = (IsAuthenticated,)
    serializer_class = NotificationSerializer
    pagination_class = NotificationPagination

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')


class NotificationMarkReadView(views.APIView):
    """POST /api/notifications/{id}/mark-read/ - Mark one as read."""
    permission_classes = (IsAuthenticated,)

    def post(self, request, id):
        try:
            from uuid import UUID
            notification = Notification.objects.get(public_id=UUID(id), user=request.user)
        except (Notification.DoesNotExist, ValueError):
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        notification.is_read = True
        notification.save()
        return Response(NotificationSerializer(notification).data)


class NotificationMarkAllReadView(views.APIView):
    """POST /api/notifications/mark-all-read/ - Mark all as read."""
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        updated = Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'updated_count': updated})
