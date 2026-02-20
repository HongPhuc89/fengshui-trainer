from rest_framework import generics, status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Comment, CommentReply
from .serializers import CommentSerializer, CommentCreateSerializer, CommentReplyCreateSerializer, CommentReplySerializer
from .services import can_comment_on_content, get_content_type_for_label


class CommentListView(generics.ListAPIView):
    """GET /api/comments/?content_type=book&object_id=uuid - List comments for content."""
    permission_classes = (IsAuthenticated,)
    serializer_class = CommentSerializer

    def get_queryset(self):
        ct_label = self.request.query_params.get('content_type')
        object_id = self.request.query_params.get('object_id')
        if not ct_label or not object_id:
            return Comment.objects.none()
        ct = get_content_type_for_label(ct_label)
        if not ct:
            return Comment.objects.none()
        return Comment.objects.filter(
            content_type=ct,
            object_id=str(object_id),
        ).select_related('user').prefetch_related('replies', 'replies__user').order_by('-is_pinned', '-created_at')


class CommentCreateView(views.APIView):
    """POST /api/comments/ - Create comment (purchase/VIP check)."""
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        serializer = CommentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ct_label = serializer.validated_data['content_type']
        object_id = str(serializer.validated_data['object_id'])
        body = serializer.validated_data['body']

        if not can_comment_on_content(request.user, ct_label, object_id):
            return Response(
                {'detail': 'Only purchasers or VIP can comment on this content.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        ct = get_content_type_for_label(ct_label)
        if not ct:
            return Response({'detail': 'Invalid content type.'}, status=status.HTTP_400_BAD_REQUEST)

        comment = Comment.objects.create(
            user=request.user,
            content_type=ct,
            object_id=object_id,
            body=body,
        )
        return Response(CommentSerializer(comment).data, status=status.HTTP_201_CREATED)


class CommentReplyView(views.APIView):
    """POST /api/comments/{id}/reply/ - Reply to comment."""
    permission_classes = (IsAuthenticated,)

    def post(self, request, id):
        try:
            from uuid import UUID
            comment = Comment.objects.get(public_id=UUID(id))
        except (Comment.DoesNotExist, ValueError):
            return Response({'detail': 'Comment not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = CommentReplyCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        body = serializer.validated_data['body']

        # Same permission as commenting: must be able to comment on the same content
        ct_label = 'book' if comment.content_type.model == 'book' else 'video_course'
        if not can_comment_on_content(request.user, ct_label, comment.object_id):
            return Response(
                {'detail': 'Only purchasers or VIP can reply.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        reply = CommentReply.objects.create(comment=comment, user=request.user, body=body)
        return Response(CommentReplySerializer(reply).data, status=status.HTTP_201_CREATED)


class CommentDeleteView(views.APIView):
    """DELETE /api/comments/{id}/ - Delete own comment (or staff)."""
    permission_classes = (IsAuthenticated,)

    def delete(self, request, id):
        try:
            from uuid import UUID
            comment = Comment.objects.get(public_id=UUID(id))
        except (Comment.DoesNotExist, ValueError):
            return Response({'detail': 'Comment not found.'}, status=status.HTTP_404_NOT_FOUND)

        if comment.user_id != request.user.id and not request.user.is_staff:
            return Response({'detail': 'Not allowed to delete this comment.'}, status=status.HTTP_403_FORBIDDEN)

        comment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
