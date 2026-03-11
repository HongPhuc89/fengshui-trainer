from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from rest_framework import status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from users.models import User
from books.models import Book, UserBookPurchase
from videos.models import VideoCourse, UserVideoPurchase
from .models import Wallet, WalletTransaction
from .serializers import PurchaseBookSerializer, PurchaseVideoSerializer, SubscribeVipSerializer
from .views import get_or_create_wallet

# VIP subscription: LT per month (configurable)
VIP_PRICE_PER_MONTH = 500


class PurchaseBookView(views.APIView):
    """POST /api/payments/purchase-book/ - Deduct LT, grant book access."""
    permission_classes = (IsAuthenticated,)
    serializer_class = PurchaseBookSerializer

    def post(self, request):
        book_id = request.data.get('book_id')
        if not book_id:
            return Response(
                {'detail': 'book_id is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            book = Book.objects.get(public_id=book_id)
        except Book.DoesNotExist:
            return Response(
                {'detail': 'Book not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        user = request.user
        if UserBookPurchase.objects.filter(user=user, book=book).exists():
            return Response(
                {'detail': 'You already own this book.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        wallet = get_or_create_wallet(user)
        price = 0 if book.is_free else book.price_lt
        if wallet.balance < price:
            return Response(
                {'detail': 'INSUFFICIENT_FUNDS', 'balance': wallet.balance, 'required': price},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            wallet.balance -= price
            wallet.save(update_fields=['balance', 'updated_at'])
            balance_after = wallet.balance
            WalletTransaction.objects.create(
                wallet=wallet,
                amount=-price,
                transaction_type='PURCHASE_BOOK',
                reference_id=str(book.public_id),
                description=f'Purchased book: {book.title}',
                balance_after=balance_after,
            )
            UserBookPurchase.objects.create(user=user, book=book)
            try:
                from notifications.models import Notification
                Notification.objects.create(
                    user=user,
                    title='Book purchased successfully',
                    body=f'You purchased: {book.title}.',
                    notification_type='PURCHASE',
                    related_object_type='book',
                    related_object_id=str(book.public_id),
                )
            except Exception:
                pass

        return Response({
            'balance': balance_after,
            'book_id': str(book.public_id),
            'message': 'Book purchased successfully.',
        }, status=status.HTTP_200_OK)


class PurchaseVideoView(views.APIView):
    """POST /api/payments/purchase-video/ - Deduct LT, grant video access."""
    permission_classes = (IsAuthenticated,)
    serializer_class = PurchaseVideoSerializer

    def post(self, request):
        video_id = request.data.get('video_id')
        if not video_id:
            return Response(
                {'detail': 'video_id is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            video = VideoCourse.objects.get(public_id=video_id)
        except VideoCourse.DoesNotExist:
            return Response(
                {'detail': 'Video not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        user = request.user
        if UserVideoPurchase.objects.filter(user=user, video=video).exists():
            return Response(
                {'detail': 'You already own this video.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        wallet = get_or_create_wallet(user)
        price = 0 if video.is_free else video.price_lt
        if wallet.balance < price:
            return Response(
                {'detail': 'INSUFFICIENT_FUNDS', 'balance': wallet.balance, 'required': price},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            wallet.balance -= price
            wallet.save(update_fields=['balance', 'updated_at'])
            balance_after = wallet.balance
            WalletTransaction.objects.create(
                wallet=wallet,
                amount=-price,
                transaction_type='PURCHASE_VIDEO',
                reference_id=str(video.public_id),
                description=f'Purchased video: {video.title}',
                balance_after=balance_after,
            )
            UserVideoPurchase.objects.create(user=user, video=video)
            try:
                from notifications.models import Notification
                Notification.objects.create(
                    user=user,
                    title='Course purchased successfully',
                    body=f'You purchased course: {video.title}.',
                    notification_type='PURCHASE',
                    related_object_type='video_course',
                    related_object_id=str(video.public_id),
                )
            except Exception:
                pass

        return Response({
            'balance': balance_after,
            'video_id': str(video.public_id),
            'message': 'Video purchased successfully.',
        }, status=status.HTTP_200_OK)


class SubscribeVipView(views.APIView):
    """POST /api/payments/subscribe-vip/ - Deduct LT, extend VIP status."""
    permission_classes = (IsAuthenticated,)
    serializer_class = SubscribeVipSerializer

    def post(self, request):
        try:
            months = int(request.data.get('months', 1))
        except (TypeError, ValueError):
            months = 1
        if months < 1:
            months = 1

        total_price = VIP_PRICE_PER_MONTH * months
        user = request.user
        wallet = get_or_create_wallet(user)

        if wallet.balance < total_price:
            return Response(
                {'detail': 'INSUFFICIENT_FUNDS', 'balance': wallet.balance, 'required': total_price},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            wallet.balance -= total_price
            wallet.save(update_fields=['balance', 'updated_at'])
            balance_after = wallet.balance
            WalletTransaction.objects.create(
                wallet=wallet,
                amount=-total_price,
                transaction_type='VIP_SUBSCRIPTION',
                reference_id=f'vip-{months}months',
                description=f'VIP subscription {months} month(s)',
                balance_after=balance_after,
            )
            now = timezone.now()
            if user.subscription_end_date and user.subscription_end_date > now:
                new_end = user.subscription_end_date + timedelta(days=30 * months)
            else:
                new_end = now + timedelta(days=30 * months)
            user.subscription_end_date = new_end
            user.user_type = User.USER_TYPE_CHOICES[1][0]  # 'VIP'
            user.save(update_fields=['subscription_end_date', 'user_type', 'updated_at'])
            try:
                from notifications.models import Notification
                Notification.objects.create(
                    user=user,
                    title='VIP renewed successfully',
                    body=f'You renewed VIP for {months} month(s). Expires: {new_end.strftime("%Y-%m-%d")}.',
                    notification_type='VIP_EXPIRY',
                    related_object_type='vip',
                )
            except Exception:
                pass

        return Response({
            'balance': balance_after,
            'subscription_end_date': new_end.isoformat(),
            'user_type': user.user_type,
            'message': f'VIP extended by {months} month(s).',
        }, status=status.HTTP_200_OK)
