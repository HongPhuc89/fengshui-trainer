"""
Management command to verify email configuration by sending a test email.

Usage:
    python manage.py send_test_email <recipient>

Example:
    python manage.py send_test_email scottfu89@gmail.com
"""

from django.conf import settings
from django.core.mail import EmailMessage
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Send a test email to verify SMTP configuration."

    def add_arguments(self, parser):
        parser.add_argument("recipient", help="Recipient email address")

    def handle(self, *args, **options):
        recipient = options["recipient"]

        self.stdout.write("\n─── Email settings ─────────────────────────────")
        self.stdout.write(f"  EMAIL_BACKEND  : {settings.EMAIL_BACKEND}")
        self.stdout.write(f"  EMAIL_HOST     : {getattr(settings, 'EMAIL_HOST', '(not set)')}")
        self.stdout.write(f"  EMAIL_PORT     : {getattr(settings, 'EMAIL_PORT', '(not set)')}")
        self.stdout.write(f"  EMAIL_USE_TLS  : {getattr(settings, 'EMAIL_USE_TLS', False)}")
        self.stdout.write(f"  EMAIL_USE_SSL  : {getattr(settings, 'EMAIL_USE_SSL', False)}")
        self.stdout.write(f"  EMAIL_HOST_USER: {getattr(settings, 'EMAIL_HOST_USER', '(not set)')}")
        host_pass = getattr(settings, 'EMAIL_HOST_PASSWORD', '')
        masked = (host_pass[:4] + '****') if len(host_pass) > 4 else ('****' if host_pass else '(not set)')
        self.stdout.write(f"  EMAIL_HOST_PASS: {masked}")
        self.stdout.write(f"  DEFAULT_FROM   : {getattr(settings, 'DEFAULT_FROM_EMAIL', '(not set)')}")
        self.stdout.write("────────────────────────────────────────────────\n")

        self.stdout.write(f"Sending test email to {recipient} ...")

        try:
            msg = EmailMessage(
                subject="[Thiên Thư] Test Email — SMTP OK",
                body=(
                    "<h2>Test email thành công 🎉</h2>"
                    "<p>Nếu bạn nhận được email này, cấu hình SMTP của Thiên Thư hoạt động bình thường.</p>"
                    f"<p><small>Sent via: {getattr(settings, 'EMAIL_HOST', '?')}:{getattr(settings, 'EMAIL_PORT', '?')}"
                    f" — from: {getattr(settings, 'DEFAULT_FROM_EMAIL', '?')}</small></p>"
                ),
                from_email=None,
                to=[recipient],
            )
            msg.content_subtype = "html"
            msg.send(fail_silently=False)
            self.stdout.write(self.style.SUCCESS(f"✓ Email sent successfully to {recipient}"))
        except Exception as exc:
            raise CommandError(f"Failed to send email: {exc}") from exc
