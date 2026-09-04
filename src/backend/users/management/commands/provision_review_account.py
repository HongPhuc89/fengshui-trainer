from django.core.management.base import BaseCommand
from django.utils import timezone
from django.utils.crypto import get_random_string

from users.models import User
from users.services.mobile_slot import ensure_review_device


class Command(BaseCommand):
    """
    Feature-39: create or update the account used for Apple/Google store review.

    Idempotent — safe to re-run. A fresh random password is only generated when
    the account did not exist yet or --reset-password is passed; re-running
    without it just re-asserts the flags (VIP, is_review_account, far-future
    subscription) without disturbing whatever password is already set.
    """

    help = 'Provision (or update) the mobile app store review account (feature-39).'

    def add_arguments(self, parser):
        parser.add_argument('--email', default='review@huyenhoc.pro')
        parser.add_argument(
            '--reset-password', action='store_true',
            help='Generate and print a new password even if the account already exists.',
        )

    def handle(self, *args, **options):
        email = options['email'].lower()
        reset_password = options['reset_password']

        user, created = User.objects.get_or_create(
            email=email,
            defaults={'username': email, 'is_active': True},
        )

        password = None
        if created or reset_password:
            password = get_random_string(20, allowed_chars=(
                'abcdefghijkmnopqrstuvwxyzABCDEFGHIJKLMNPQRSTUVWXYZ23456789'
            ))
            user.set_password(password)

        user.is_active = True
        user.is_review_account = True
        user.user_type = 'VIP'
        user.subscription_end_date = timezone.now() + timezone.timedelta(days=3650)
        user.save()

        device = ensure_review_device(user)

        self.stdout.write(self.style.SUCCESS(
            f'{"Created" if created else "Updated"} review account: {user.email}'
        ))
        self.stdout.write(f'  device_id (fixed): {device.device_id}')
        self.stdout.write(f'  client_code: {device.client_code}')
        if password:
            self.stdout.write(self.style.WARNING(f'  password: {password}'))
            self.stdout.write(self.style.WARNING(
                '  Save this now — it is not stored anywhere and will not be shown again.'
            ))
        else:
            self.stdout.write('  password: unchanged (pass --reset-password to generate a new one)')
