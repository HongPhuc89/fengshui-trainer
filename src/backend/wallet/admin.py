import csv
import secrets
from django.contrib import admin
from django.db import transaction
from django.http import HttpResponse
from django.utils import timezone
from django.utils.html import format_html
from django.urls import path
from django.shortcuts import render, redirect
from django.contrib import messages

from users.models import AdminAuditLog
from .models import Wallet, Voucher, WalletTransaction


# Characters for voucher codes: alphanumeric without 0, O, 1, I
VOUCHER_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'


def generate_voucher_code(length=12):
    """Generate a secure random voucher code without ambiguous characters."""
    return ''.join(secrets.choice(VOUCHER_ALPHABET) for _ in range(length))


def format_voucher_code(raw: str) -> str:
    """Format as XXX-XXXX-XXXX for readability."""
    parts = [raw[i:i+4] for i in range(0, len(raw), 4)]
    return '-'.join(parts)


@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ('user', 'balance', 'total_recharged', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__username', 'user__phone_number', 'user__email')
    readonly_fields = ('total_recharged',)
    raw_id_fields = ('user',)

    def save_model(self, request, obj, form, change):
        if change and obj.pk:
            old = Wallet.objects.get(pk=obj.pk)
            if old.balance != obj.balance:
                delta = obj.balance - old.balance
                with transaction.atomic():
                    super().save_model(request, obj, form, change)
                    audit = AdminAuditLog.objects.create(
                        staff=request.user,
                        target_user=obj.user,
                        action_category='CURRENCY',
                        action_detail=f'Wallet balance changed from {old.balance} to {obj.balance}',
                        change_log={'before': {'balance': old.balance}, 'after': {'balance': obj.balance}},
                        ip_address=self.get_client_ip(request),
                    )
                    WalletTransaction.objects.create(
                        wallet=obj,
                        amount=delta,
                        transaction_type='ADMIN_EDIT',
                        reference_id=str(audit.public_id),
                        description=f'Admin balance edit: {old.balance} -> {obj.balance}',
                        balance_after=obj.balance,
                    )
                return
        super().save_model(request, obj, form, change)

    @staticmethod
    def get_client_ip(request):
        xff = request.META.get('HTTP_X_FORWARDED_FOR')
        if xff:
            return xff.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')


@admin.register(Voucher)
class VoucherAdmin(admin.ModelAdmin):
    list_display = ('code', 'value', 'is_used', 'used_by', 'used_at', 'expires_at', 'created_at')
    list_filter = ('is_used', 'created_at')
    search_fields = ('code',)
    readonly_fields = ('used_by', 'used_at')
    raw_id_fields = ('used_by',)
    change_list_template = 'admin/wallet/voucher/change_list.html'

    def get_urls(self):
        urls = super().get_urls()
        custom = [
            path('bulk-generate/', self.admin_site.admin_view(self.bulk_generate_view), name='wallet_voucher_bulk_generate'),
        ]
        return custom + urls

    def bulk_generate_view(self, request):
        if request.method == 'POST':
            try:
                count = int(request.POST.get('count', 0))
                value = int(request.POST.get('value', 0))
            except (TypeError, ValueError):
                messages.error(request, 'Invalid count or value.')
                return redirect('admin:wallet_voucher_bulk_generate')
            if count <= 0 or value <= 0 or count > 1000:
                messages.error(request, 'Count must be 1-1000 and value must be positive.')
                return redirect('admin:wallet_voucher_bulk_generate')
            codes = []
            with transaction.atomic():
                for _ in range(count):
                    raw = generate_voucher_code(12)
                    code = format_voucher_code(raw)
                    while Voucher.objects.filter(code=code).exists():
                        raw = generate_voucher_code(12)
                        code = format_voucher_code(raw)
                    Voucher.objects.create(code=code, value=value)
                    codes.append((code, value))
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="vouchers.csv"'
            writer = csv.writer(response)
            writer.writerow(['code', 'value_lt'])
            for code, val in codes:
                writer.writerow([code, val])
            return response
        return render(request, 'admin/wallet/voucher/bulk_generate.html', {
            'title': 'Bulk Generate Vouchers',
            'opts': self.model._meta,
        })


@admin.register(WalletTransaction)
class WalletTransactionAdmin(admin.ModelAdmin):
    list_display = ('wallet', 'amount', 'transaction_type', 'reference_id', 'balance_after', 'created_at')
    list_filter = ('transaction_type', 'created_at')
    search_fields = ('wallet__user__username', 'reference_id', 'description')
    readonly_fields = ('wallet', 'amount', 'transaction_type', 'reference_id', 'description', 'balance_after', 'created_at')
    raw_id_fields = ('wallet',)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
