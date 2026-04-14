"""Management command to backfill small WebP covers for existing books (Feature 31)."""
from django.core.management.base import BaseCommand

from books.models import Book
from books.utils import generate_and_upload_small_cover


class Command(BaseCommand):
    help = (
        "Generate and upload small WebP covers to Bunny Storage for all books that have a "
        "cover_image but no small_cover yet. Use --force to re-upload all regardless."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            default=False,
            help='Re-upload and overwrite even if small_cover already exists.',
        )

    def handle(self, *args, **options):
        force = options['force']

        qs = Book.objects.exclude(cover_image='').filter(cover_image__isnull=False)
        if not force:
            qs = qs.filter(small_cover='')

        total = qs.count()
        self.stdout.write(f"Found {total} book(s) to process.")

        success = 0
        errors = 0
        for book in qs.iterator():
            try:
                url = generate_and_upload_small_cover(book.pk, book.cover_image, force=force)
                Book.objects.filter(pk=book.pk).update(small_cover=url)
                success += 1
                self.stdout.write(f"  [OK] Book {book.pk}: {book.title}")
            except Exception as exc:
                errors += 1
                self.stderr.write(f"  [ERR] Book {book.pk}: {book.title} — {exc}")

        self.stdout.write(self.style.SUCCESS(f"Done. {success} uploaded, {errors} failed."))
