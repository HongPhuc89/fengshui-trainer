from rest_framework import serializers
from .models import Wallet, WalletTransaction


class WalletMeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Wallet
        fields = ('balance', 'total_recharged')


class RedeemInputSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=20, trim_whitespace=True)


class WalletTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalletTransaction
        fields = (
            'public_id', 'amount', 'transaction_type',
            'reference_id', 'description', 'balance_after', 'created_at',
        )


class PurchaseBookSerializer(serializers.Serializer):
    book_id = serializers.UUIDField()


class PurchaseVideoSerializer(serializers.Serializer):
    video_id = serializers.UUIDField()


class SubscribeVipSerializer(serializers.Serializer):
    months = serializers.IntegerField(min_value=1, default=1)
