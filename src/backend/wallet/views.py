from django.db import transaction
from django.utils import timezone
from rest_framework import generics, status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination

from .models import Wallet, Voucher, WalletTransaction
from .serializers import WalletMeSerializer, RedeemInputSerializer, WalletTransactionSerializer


def get_or_create_wallet(user):
    wallet, _ = Wallet.objects.get_or_create(user=user, defaults={'balance': 0, 'total_recharged': 0})
    return wallet


class WalletMeView(views.APIView):
    """GET /api/wallet/me/ - Get current balance and total recharged."""
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        wallet = get_or_create_wallet(request.user)
        serializer = WalletMeSerializer(wallet)
        return Response(serializer.data)


class RedeemView(views.APIView):
    """POST /api/wallet/redeem/ - Redeem voucher code."""
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        serializer = RedeemInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        raw = serializer.validated_data['code'].strip().upper().replace(' ', '').replace('-', '')[:12]
        # Stored format is XXXX-XXXX-XXXX (12 chars)
        formatted = f"{raw[:4]}-{raw[4:8]}-{raw[8:12]}" if len(raw) >= 12 else raw

        voucher = Voucher.objects.filter(code=formatted).first()
        if not voucher:
            return Response(
                {'detail': 'Invalid or expired voucher code.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if voucher.is_used:
            return Response(
                {'detail': 'This voucher has already been used.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if voucher.expires_at and voucher.expires_at < timezone.now():
            return Response(
                {'detail': 'This voucher has expired.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            wallet = get_or_create_wallet(request.user)
            voucher.is_used = True
            voucher.used_by = request.user
            voucher.used_at = timezone.now()
            voucher.save(update_fields=['is_used', 'used_by', 'used_at', 'updated_at'])
            wallet.balance += voucher.value
            wallet.total_recharged += voucher.value
            wallet.save(update_fields=['balance', 'total_recharged', 'updated_at'])
            balance_after = wallet.balance
            WalletTransaction.objects.create(
                wallet=wallet,
                amount=voucher.value,
                transaction_type='RECHARGE_VOUCHER',
                reference_id=voucher.code,
                description=f'Redeemed voucher {voucher.code}',
                balance_after=balance_after,
            )
        return Response({'balance': balance_after, 'total_recharged': wallet.total_recharged})


class WalletHistoryPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class WalletHistoryView(generics.ListAPIView):
    """GET /api/wallet/history/ - Paginated list of user's WalletTransactions."""
    permission_classes = (IsAuthenticated,)
    serializer_class = WalletTransactionSerializer
    pagination_class = WalletHistoryPagination

    def get_queryset(self):
        wallet = get_or_create_wallet(self.request.user)
        return WalletTransaction.objects.filter(wallet=wallet).order_by('-created_at')
