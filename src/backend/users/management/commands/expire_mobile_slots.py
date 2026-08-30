from django.core.management.base import BaseCommand

from users.tasks import expire_mobile_slots


class Command(BaseCommand):
    help = "Expire unclaimed mobile device slots past their deadline, releasing quota."

    def handle(self, *args, **options):
        count = expire_mobile_slots()
        self.stdout.write(self.style.SUCCESS(f'Expired {count} slot(s).'))
