"""
Management command để import fake data từ file JSON vào database.

Dữ liệu nằm ở: src/backend/fixtures/fake/
  users.json    — tài khoản test
  books.json    — danh mục sách, sách, chương
  videos.json   — danh mục video, khóa học, bài học
  exams.json    — modules luyện tập, bài thi, câu hỏi, flashcards
  vouchers.json — mã nạp Linh Thạch

Usage:
    python manage.py import_fake_data
    python manage.py import_fake_data --clear          # Xóa data cũ trước
    python manage.py import_fake_data --users-only     # Chỉ tạo users + vouchers
    python manage.py import_fake_data --no-purchases   # Không tạo lịch sử mua hàng
    python manage.py import_fake_data --data-dir /path/to/json/  # Thư mục JSON tùy chỉnh
"""

import json
from datetime import timedelta
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

DEFAULT_DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "fixtures" / "fake"


class Command(BaseCommand):
    help = "Import fake data từ file JSON vào database (dùng cho development/testing)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Xóa toàn bộ dữ liệu fake trước khi import",
        )
        parser.add_argument(
            "--users-only",
            action="store_true",
            help="Chỉ tạo users và vouchers",
        )
        parser.add_argument(
            "--no-purchases",
            action="store_true",
            help="Không tạo dữ liệu mua sách/video mẫu",
        )
        parser.add_argument(
            "--data-dir",
            type=str,
            default=None,
            help=f"Đường dẫn thư mục chứa file JSON (mặc định: fixtures/fake/)",
        )

    def handle(self, *args, **options):
        data_dir = Path(options["data_dir"]) if options["data_dir"] else DEFAULT_DATA_DIR
        if not data_dir.is_dir():
            raise CommandError(f"Không tìm thấy thư mục dữ liệu: {data_dir}")

        self.stdout.write(self.style.MIGRATE_HEADING("=== Import Fake Data: Thiên Thư ==="))
        self.stdout.write(f"📂 Thư mục dữ liệu: {data_dir}\n")

        if options["clear"]:
            self._clear_data()

        users_data    = self._load_json(data_dir, "users.json")
        vouchers_data = self._load_json(data_dir, "vouchers.json")

        with transaction.atomic():
            users = self._create_users(users_data)

            if options["users_only"]:
                self._create_vouchers(vouchers_data)
                self.stdout.write(self.style.SUCCESS("\n✅ Xong! Chỉ tạo users và vouchers."))
                return

            books_data  = self._load_json(data_dir, "books.json")
            videos_data = self._load_json(data_dir, "videos.json")
            exams_data  = self._load_json(data_dir, "exams.json")

            book_cats        = self._create_book_categories(books_data["categories"])
            books, chapters  = self._create_books(books_data["books"], book_cats)

            video_cats        = self._create_video_categories(videos_data["categories"])
            courses, lessons  = self._create_video_courses(videos_data["courses"], video_cats)

            modules              = self._create_practice_modules(exams_data["modules"])
            exams, _questions    = self._create_exams(exams_data["exams"], modules)
            flashcards           = self._create_flashcards(exams_data["flashcards"], modules)

            self._create_vouchers(vouchers_data)

            if not options["no_purchases"]:
                self._create_sample_purchases(users, books, courses)
                self._create_sample_progress(users, chapters, lessons)
                self._create_sample_flashcard_reviews(users, flashcards)

            self._create_notifications(users)

        self._print_summary(users_data, vouchers_data, books, courses, exams, flashcards)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _load_json(self, data_dir: Path, filename: str) -> dict | list:
        path = data_dir / filename
        if not path.exists():
            raise CommandError(f"Không tìm thấy file: {path}")
        with open(path, encoding="utf-8") as f:
            return json.load(f)

    def _ok(self, created: bool, label: str):
        prefix = "  ✓ mới" if created else "  → đã có"
        self.stdout.write(f"{prefix}: {label}")

    # ------------------------------------------------------------------
    # Clear
    # ------------------------------------------------------------------

    def _clear_data(self):
        self.stdout.write("🗑️  Xóa dữ liệu cũ...")

        from books.models import BookCategory, BookChapter, UserBookPurchase, UserChapterProgress
        from comments.models import Comment, CommentReply
        from exams.models import Exam, Flashcard, FlashcardReview, PracticeModule, UserExamProgress
        from notifications.models import Notification
        from users.models import User
        from videos.models import UserLessonProgress, UserVideoPurchase, VideoCategory, VideoCourse
        from wallet.models import Voucher, Wallet, WalletTransaction

        FlashcardReview.objects.all().delete()
        UserExamProgress.objects.all().delete()
        UserChapterProgress.objects.all().delete()
        UserLessonProgress.objects.all().delete()
        UserBookPurchase.objects.all().delete()
        UserVideoPurchase.objects.all().delete()
        CommentReply.objects.all().delete()
        Comment.objects.all().delete()
        Notification.objects.all().delete()
        WalletTransaction.objects.all().delete()
        Wallet.objects.all().delete()
        Voucher.objects.filter(is_used=False).delete()
        Flashcard.objects.all().delete()
        Exam.objects.all().delete()
        PracticeModule.objects.all().delete()
        BookChapter.objects.all().delete()
        BookCategory.objects.all().delete()
        VideoCourse.objects.all().delete()
        VideoCategory.objects.all().delete()
        User.objects.filter(username__startswith="demo_").delete()

        self.stdout.write(self.style.WARNING("  → Đã xóa xong.\n"))

    # ------------------------------------------------------------------
    # Users
    # ------------------------------------------------------------------

    def _create_users(self, users_data: list) -> list:
        from users.models import User
        from wallet.models import Wallet

        self.stdout.write("👤 Tạo users...")
        created_users = []

        for data in users_data:
            user, created = User.objects.get_or_create(
                username=data["username"],
                defaults={
                    "email": data.get("email", ""),
                    "first_name": data.get("first_name", ""),
                    "last_name": data.get("last_name", ""),
                    "phone_number": data.get("phone_number"),
                    "user_type": data.get("user_type", "FREE"),
                    "is_device_locked": False,
                },
            )
            if created:
                user.set_password(data["password"])
                if data.get("vip_days"):
                    user.subscription_end_date = timezone.now() + timedelta(days=data["vip_days"])
                user.save()

            balance = data.get("wallet_balance", 0)
            wallet, wallet_created = Wallet.objects.get_or_create(
                user=user,
                defaults={"balance": balance},
            )
            if not wallet_created and balance:
                wallet.balance = balance
                wallet.save()

            created_users.append(user)
            self._ok(created, f"{user.username} ({user.user_type}) — {wallet.balance} LT")

        return created_users

    # ------------------------------------------------------------------
    # Books
    # ------------------------------------------------------------------

    def _create_book_categories(self, categories: list) -> dict:
        from books.models import BookCategory

        self.stdout.write("\n📚 Tạo danh mục sách...")
        result = {}
        for data in categories:
            obj, created = BookCategory.objects.get_or_create(
                slug=data["slug"],
                defaults={"title": data["title"]},
            )
            result[data["slug"]] = obj
            self._ok(created, obj.title)
        return result

    def _create_books(self, books: list, categories: dict) -> tuple:
        from books.models import Book, BookChapter

        self.stdout.write("\n📖 Tạo sách và chương...")
        all_books, all_chapters = [], []

        for data in books:
            book, created = Book.objects.get_or_create(
                slug=data["slug"],
                defaults={
                    "category": categories.get(data.get("category_slug")),
                    "title": data["title"],
                    "author": data.get("author", ""),
                    "description": data.get("description", ""),
                    "is_free": data.get("is_free", False),
                    "is_new_release": data.get("is_new_release", False),
                    "price_lt": data.get("price_lt", 0),
                    "published_date": timezone.now().date(),
                },
            )
            all_books.append(book)

            new_chapters = 0
            for ch in data.get("chapters", []):
                chapter, ch_created = BookChapter.objects.get_or_create(
                    book=book,
                    slug=ch["slug"],
                    defaults={
                        "title": ch["title"],
                        "order": ch["order"],
                        "file_path": f"books/{book.slug}/chapter_{ch['order']:02d}.pdf",
                        "file_size": ch["order"] * 200 * 1024,
                        "page_count": ch["order"] * 5 + 10,
                        "is_demo": ch.get("is_demo", False),
                    },
                )
                if ch_created:
                    all_chapters.append(chapter)
                    new_chapters += 1

            price_str = f"{book.price_lt} LT" if not book.is_free else "Miễn phí"
            self._ok(created, f"{book.title} ({price_str}) — {new_chapters} chương mới")

        return all_books, all_chapters

    # ------------------------------------------------------------------
    # Videos
    # ------------------------------------------------------------------

    def _create_video_categories(self, categories: list) -> dict:
        from videos.models import VideoCategory

        self.stdout.write("\n🎬 Tạo danh mục video...")
        result = {}
        for data in categories:
            obj, created = VideoCategory.objects.get_or_create(
                slug=data["slug"],
                defaults={"title": data["title"]},
            )
            result[data["slug"]] = obj
            self._ok(created, obj.title)
        return result

    def _create_video_courses(self, courses: list, categories: dict) -> tuple:
        from videos.models import VideoLesson, VideoCourse

        self.stdout.write("\n🎥 Tạo khóa học video và bài học...")
        all_courses, all_lessons = [], []

        for data in courses:
            lessons_list = data.get("lessons", [])
            total_duration = sum(l.get("duration_seconds", 0) for l in lessons_list)

            course, created = VideoCourse.objects.get_or_create(
                slug=data["slug"],
                defaults={
                    "category": categories.get(data.get("category_slug")),
                    "title": data["title"],
                    "description": data.get("description", ""),
                    "instructor": data.get("instructor", ""),
                    "is_free": data.get("is_free", False),
                    "price_lt": data.get("price_lt", 0),
                    "level": data.get("level", "BEGINNER"),
                    "total_duration_seconds": total_duration,
                    "total_lessons": len(lessons_list),
                    "published_date": timezone.now().date(),
                },
            )
            all_courses.append(course)

            new_lessons = 0
            for l in lessons_list:
                lesson, l_created = VideoLesson.objects.get_or_create(
                    course=course,
                    slug=l["slug"],
                    defaults={
                        "title": l["title"],
                        "order": l["order"],
                        "duration_seconds": l.get("duration_seconds", 0),
                        "is_free": l.get("is_free", False),
                        "summary": l.get("summary", ""),
                        "transcript": l.get("transcript", ""),
                        "video_url": "",
                        "video_id": "",
                    },
                )
                if l_created:
                    all_lessons.append(lesson)
                    new_lessons += 1

            price_str = f"{course.price_lt} LT" if not course.is_free else "Miễn phí"
            duration_min = total_duration // 60
            self._ok(created, f"{course.title} ({price_str}) — {new_lessons} bài mới, ~{duration_min} phút")

        return all_courses, all_lessons

    # ------------------------------------------------------------------
    # Exams & Practice
    # ------------------------------------------------------------------

    def _create_practice_modules(self, modules: list) -> dict:
        from exams.models import PracticeModule

        self.stdout.write("\n🏋️  Tạo module luyện tập...")
        result = {}
        for data in modules:
            obj, created = PracticeModule.objects.get_or_create(
                slug=data["slug"],
                defaults={
                    "title": data["title"],
                    "description": data.get("description", ""),
                    "order": data.get("order", 0),
                },
            )
            result[data["slug"]] = obj
            self._ok(created, obj.title)
        return result

    def _create_exams(self, exams: list, modules: dict) -> tuple:
        from exams.models import Exam, PracticeQuestion

        self.stdout.write("\n📝 Tạo bài thi và câu hỏi...")
        all_exams, all_questions = [], []

        for data in exams:
            exam, created = Exam.objects.get_or_create(
                slug=data["slug"],
                defaults={
                    "module": modules.get(data.get("module_slug")),
                    "title": data["title"],
                    "description": data.get("description", ""),
                    "passing_score": data.get("passing_score", 70),
                    "exam_type": data.get("exam_type", "PRACTICE"),
                    "time_limit_minutes": data.get("time_limit_minutes"),
                },
            )
            all_exams.append(exam)

            new_q = 0
            for q in data.get("questions", []):
                question, q_created = PracticeQuestion.objects.get_or_create(
                    exam=exam,
                    order=q["order"],
                    defaults={
                        "question_text": q["question_text"],
                        "options": q["options"],
                        "correct_answer": q["correct_answer"],
                        "explanation": q.get("explanation", ""),
                        "difficulty": q.get("difficulty", "MEDIUM"),
                        "points": q.get("points", 10),
                    },
                )
                if q_created:
                    all_questions.append(question)
                    new_q += 1

            self._ok(created, f"[{exam.exam_type}] {exam.title} — {new_q} câu mới")

        return all_exams, all_questions

    def _create_flashcards(self, flashcard_groups: list, modules: dict) -> list:
        from exams.models import Flashcard

        self.stdout.write("\n🃏 Tạo flashcards...")
        all_cards = []

        for group in flashcard_groups:
            module = modules.get(group["module_slug"])
            new_cards = 0
            for card in group.get("cards", []):
                obj, created = Flashcard.objects.get_or_create(
                    module=module,
                    order=card["order"],
                    defaults={
                        "front": card["front"],
                        "back": card["back"],
                        "difficulty": card.get("difficulty", "MEDIUM"),
                    },
                )
                if created:
                    all_cards.append(obj)
                    new_cards += 1

            module_title = module.title if module else group["module_slug"]
            self.stdout.write(f"  {module_title}: {new_cards} thẻ mới")

        return all_cards

    # ------------------------------------------------------------------
    # Vouchers
    # ------------------------------------------------------------------

    def _create_vouchers(self, vouchers_data: list):
        from wallet.models import Voucher

        self.stdout.write("\n🎫 Tạo vouchers...")
        new_count = 0
        for data in vouchers_data:
            _, created = Voucher.objects.get_or_create(
                code=data["code"],
                defaults={
                    "value": data["value"],
                    "is_used": False,
                    "expires_at": timezone.now() + timedelta(days=data.get("expires_days", 365)),
                },
            )
            if created:
                new_count += 1

        self.stdout.write(f"  → {new_count} vouchers mới")
        self.stdout.write("  Mã để test:")
        for v in vouchers_data[:3]:
            self.stdout.write(f"    • {v['code']} = {v['value']} LT")

    # ------------------------------------------------------------------
    # Sample activity data
    # ------------------------------------------------------------------

    def _create_sample_purchases(self, users: list, books: list, courses: list):
        from books.models import UserBookPurchase
        from videos.models import UserVideoPurchase
        from wallet.models import WalletTransaction

        self.stdout.write("\n🛒 Tạo lịch sử mua hàng mẫu...")
        purchased = 0

        vip_users  = [u for u in users if u.user_type == "VIP"]
        paid_users = [u for u in users if u.user_type == "USER"]

        for user in vip_users:
            if books:
                book = books[0]
                _, created = UserBookPurchase.objects.get_or_create(user=user, book=book)
                if created:
                    purchased += 1
                    if hasattr(user, "wallet"):
                        WalletTransaction.objects.get_or_create(
                            wallet=user.wallet,
                            reference_id=str(book.public_id),
                            transaction_type="PURCHASE_BOOK",
                            defaults={
                                "amount": -book.price_lt,
                                "description": f"Mua sách: {book.title}",
                                "balance_after": max(0, user.wallet.balance - book.price_lt),
                            },
                        )
            if courses:
                _, created = UserVideoPurchase.objects.get_or_create(user=user, video=courses[0])
                if created:
                    purchased += 1

        for user in paid_users:
            if len(books) > 1:
                _, created = UserBookPurchase.objects.get_or_create(user=user, book=books[1])
                if created:
                    purchased += 1

        self.stdout.write(f"  → {purchased} purchases mới")

    def _create_sample_progress(self, users: list, chapters: list, lessons: list):
        from books.models import UserChapterProgress
        from videos.models import UserLessonProgress

        self.stdout.write("\n📊 Tạo progress mẫu...")
        count = 0

        for user in [u for u in users if u.user_type in ("VIP", "USER")]:
            for chapter in chapters[:2]:
                _, created = UserChapterProgress.objects.get_or_create(
                    user=user, chapter=chapter,
                    defaults={"completed": True},
                )
                if created:
                    count += 1

            for lesson in lessons[:2]:
                _, created = UserLessonProgress.objects.get_or_create(
                    user=user, lesson=lesson,
                    defaults={
                        "progress_seconds": lesson.duration_seconds or 0,
                        "completed": True,
                    },
                )
                if created:
                    count += 1

        self.stdout.write(f"  → {count} progress records mới")

    def _create_sample_flashcard_reviews(self, users: list, flashcards: list):
        from exams.models import FlashcardReview

        self.stdout.write("\n🔄 Tạo flashcard review mẫu...")
        count = 0

        for user in users[:2]:
            for card in flashcards[:4]:
                _, created = FlashcardReview.objects.get_or_create(
                    user=user,
                    flashcard=card,
                    defaults={
                        "ease_factor": 2.5,
                        "interval": 1,
                        "repetitions": 1,
                        "next_review": timezone.now() + timedelta(days=1),
                    },
                )
                if created:
                    count += 1

        self.stdout.write(f"  → {count} flashcard reviews mới")

    def _create_notifications(self, users: list):
        from notifications.models import Notification

        self.stdout.write("\n🔔 Tạo thông báo mẫu...")
        count = 0

        sample = [
            {
                "title": "Chào mừng đến với Thiên Thư!",
                "body": "Bắt đầu hành trình học Phong Thủy của bạn ngay hôm nay. Khám phá các sách và khóa học miễn phí!",
                "notification_type": "SYSTEM",
            },
            {
                "title": "Voucher độc quyền cho bạn",
                "body": "Dùng mã WELCOME-2026 để nhận 100 Linh Thạch vào ví của bạn.",
                "notification_type": "RECHARGE",
            },
        ]

        for user in users:
            for notif in sample:
                _, created = Notification.objects.get_or_create(
                    user=user,
                    title=notif["title"],
                    defaults={
                        "body": notif["body"],
                        "notification_type": notif["notification_type"],
                        "is_read": False,
                    },
                )
                if created:
                    count += 1

        self.stdout.write(f"  → {count} thông báo mới")

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------

    def _print_summary(self, users_data, vouchers_data, books, courses, exams, flashcards):
        self.stdout.write("\n" + "=" * 52)
        self.stdout.write(self.style.SUCCESS("✅ Import fake data hoàn thành!\n"))
        self.stdout.write(self.style.MIGRATE_HEADING("📋 Tóm tắt:"))
        self.stdout.write(f"  • Users      : {len(users_data)} tài khoản")
        self.stdout.write(f"  • Sách       : {len(books)} cuốn")
        self.stdout.write(f"  • Khóa video : {len(courses)} khóa")
        self.stdout.write(f"  • Bài thi    : {len(exams)} bài")
        self.stdout.write(f"  • Flashcards : {len(flashcards)} thẻ")
        self.stdout.write(f"  • Vouchers   : {len(vouchers_data)} mã")

        self.stdout.write("")
        self.stdout.write(self.style.MIGRATE_HEADING("🔑 Tài khoản test:"))
        for u in users_data:
            self.stdout.write(f"  • {u['email']} / {u['password']}  [{u['user_type']}]")

        self.stdout.write("")
        self.stdout.write(self.style.MIGRATE_HEADING("🎫 Voucher test:"))
        for v in vouchers_data[:5]:
            self.stdout.write(f"  • {v['code']} = {v['value']} LT")

        self.stdout.write("=" * 52 + "\n")
