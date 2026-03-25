import csv
from pathlib import Path

from django.core.files import File
from django.core.management.base import BaseCommand, CommandError
from django.utils.text import slugify

from books.models import Book, BookChapter

DEFAULT_CSV = Path("data/chapter_list.csv")
DEFAULT_PDF_DIR = Path("data/book_chapter")


# ── helpers ──────────────────────────────────────────────────────────────────

def _to_sentence_key(text: str) -> str:
    return slugify(text)


def _read_csv_titles(csv_path: Path) -> list[str]:
    titles = []
    with open(csv_path, encoding="utf-8") as f:
        for row in csv.reader(f):
            if row and row[0].strip():
                titles.append(row[0].strip().capitalize())
    return titles


def _sync_single_chapter(book: Book, order: int, title: str) -> str:
    """Create or update a single chapter. Returns 'created' | 'updated' | 'unchanged'."""
    slug = _to_sentence_key(title)
    chapter = BookChapter.objects.filter(book=book, order=order).first()
    if not chapter:
        BookChapter.objects.create(book=book, order=order, title=title, slug=slug)
        return "created"
    if chapter.title != title:
        chapter.title = title
        chapter.slug = slug
        chapter.save(update_fields=["title", "slug"])
        return "updated"
    return "unchanged"


def _sync_chapters_from_csv(book: Book, csv_path: Path, stdout, style) -> None:
    titles = _read_csv_titles(csv_path)
    counts = {"created": 0, "updated": 0, "unchanged": 0}
    for i, title in enumerate(titles):
        order = i + 1
        status = _sync_single_chapter(book, order, title)
        counts[status] += 1
        if status != "unchanged":
            stdout.write(f"  [{status.upper()}] order={order}: {title}")
    stdout.write(style.SUCCESS(
        f"  CSV sync: {counts['created']} created, "
        f"{counts['updated']} updated, {counts['unchanged']} unchanged"
    ))


# ── PDF upload ────────────────────────────────────────────────────────────────

def _sorted_pdf_files(pdf_dir: Path) -> list[Path]:
    """Sort PDFs by the numeric prefix in their filename."""
    def _numeric_prefix(p: Path) -> int:
        part = p.name.split("_")[0]
        return int(part) if part.isdigit() else 0

    return sorted(
        [f for f in pdf_dir.iterdir() if f.suffix.lower() == ".pdf"],
        key=_numeric_prefix,
    )


def _upload_pdf_to_chapter(chapter: BookChapter, pdf_path: Path) -> None:
    with open(pdf_path, "rb") as f:
        chapter.file_path.save(pdf_path.name, File(f), save=False)
    chapter.file_size = pdf_path.stat().st_size
    chapter.save(update_fields=["file_path", "file_size"])


def _upload_missing_pdfs(book: Book, pdf_dir: Path, stdout, style) -> None:
    pdf_files = _sorted_pdf_files(pdf_dir)
    chapters = list(book.chapters.order_by("order"))
    uploaded = 0

    for chapter in chapters:
        if chapter.file_path:
            continue
        idx = chapter.order - 1
        if idx >= len(pdf_files):
            stdout.write(style.WARNING(f"  No PDF available for chapter order={chapter.order}"))
            continue
        _upload_pdf_to_chapter(chapter, pdf_files[idx])
        stdout.write(f"  [UPLOADED] order={chapter.order}: {pdf_files[idx].name}")
        uploaded += 1

    stdout.write(style.SUCCESS(f"  PDF upload: {uploaded} file(s) uploaded."))


# ── command ───────────────────────────────────────────────────────────────────

class Command(BaseCommand):
    help = "Sync book chapters from CSV and upload missing PDF files."

    def add_arguments(self, parser):
        parser.add_argument("book_id", type=int, help="ID of the Book to sync")
        parser.add_argument(
            "--csv",
            default=str(DEFAULT_CSV),
            help=f"Path to chapter list CSV (default: {DEFAULT_CSV})",
        )
        parser.add_argument(
            "--pdf-dir",
            default=str(DEFAULT_PDF_DIR),
            help=f"Directory containing chapter PDFs (default: {DEFAULT_PDF_DIR})",
        )

    def handle(self, *args, **options):
        try:
            book = Book.objects.get(id=options["book_id"])
        except Book.DoesNotExist:
            raise CommandError(f"Book id={options['book_id']} not found.")

        csv_path = Path(options["csv"])
        pdf_dir = Path(options["pdf_dir"])

        self.stdout.write(f"Book: {book.title} (id={book.id})\n")

        self.stdout.write("[1] Syncing chapters from CSV...")
        if csv_path.exists():
            _sync_chapters_from_csv(book, csv_path, self.stdout, self.style)
        else:
            self.stdout.write(self.style.WARNING(f"  CSV not found: {csv_path} — skipped."))
            exit(1)

        self.stdout.write("\n[2] Uploading missing PDFs...")
        if pdf_dir.exists():
            _upload_missing_pdfs(book, pdf_dir, self.stdout, self.style)
        else:
            self.stdout.write(self.style.WARNING(f"  PDF dir not found: {pdf_dir} — skipped."))
