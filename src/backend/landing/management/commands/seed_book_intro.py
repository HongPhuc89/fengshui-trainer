from django.core.management.base import BaseCommand

from landing.models import BookIntroPage

CHAPTERS_DATA = [
    {
        "chapter_label": "CHAPTER I",
        "title": "Huyền Không phi tinh học 1 cuốn là thành thạo (bộ 3 cuốn-1200 trang)",
        "subtitle": "Bộ 3 cuốn - 1200 trang",
        "price_label": "100 linh thạch",
        "display_type": "accordion",
        "icon": "",
        "items": [
            {
                "title": "1.1. Huyền không phi tinh một cuốn là thành thạo",
                "demo_url": "https://drive.google.com/file/d/1E94k4DwyGyaMrgx25omxSEYpLuxYMYpP/view?usp=share_link",
                "demo_label": "XEM DEMO",
                "copy_link_url": "",
            },
            {
                "title": "1.2. Học phong thuỷ đoán bệnh 1 cuốn là thành thạo",
                "demo_url": "https://drive.google.com/file/d/1raAWm8KKfGiciz0g8YqZ4dMUnJ7bYQjm/view?usp=share_link",
                "demo_label": "XEM DEMO",
                "copy_link_url": "",
            },
            # 1.3 is a gift book with no demo link — not included as a clickable item
            {
                "title": "1.4. Tặng kèm kim toả ngọc quan hình tượng phong thuỷ (35 linh thạch)",
                "demo_url": "https://drive.google.com/file/d/1Raul_eYSHDr_DIMvYDeWN7U1-TvcxXw5/view?usp=share_link",
                "demo_label": "XEM DEMO",
                "copy_link_url": "",
            },
        ],
    },
    {
        "chapter_label": "CHAPTER II",
        "title": "Huyền không lục pháp tân truyền (bộ 4 cuốn-2000 trang)",
        "subtitle": "Bộ 4 cuốn - 2000 trang",
        "price_label": "150 linh thạch",
        "display_type": "accordion",
        "icon": "",
        "items": [
            {
                "title": "2.1. Huyền không lục pháp bí kíp đồ giải",
                "demo_url": "https://drive.google.com/file/d/13h7zP8tOFTBmBVGdnkc0R50ILL_wgViC/view?usp=share_link",
                "demo_label": "XEM DEMO",
                "copy_link_url": "",
            },
            {
                "title": "2.2. Huyền không lục pháp tân truyền (tập 1-2)",
                "demo_url": "https://drive.google.com/file/d/1eYjybAzeJMk7t3Pib_52anzSjZB1G_cM/view?usp=share_link",
                "demo_label": "XEM DEMO",
                "copy_link_url": "",
            },
            # 2.3 is a gift book with no demo link — not included as a clickable item
        ],
    },
    {
        "chapter_label": "CHAPTER III",
        "title": "Chính Ngũ Hành Trạch Nhật Tinh Giải (1000 trang)",
        "subtitle": "1000 trang",
        "price_label": "200 linh thạch",
        "display_type": "featured",
        "icon": "auto_stories",
        "items": [
            {
                "title": "",
                "demo_url": "https://drive.google.com/file/d/1iIAyLo5K7sXsS0JvX20z9Qe_f2rJFBnm/view?usp=share_link",
                "demo_label": "Xem Demo Bản Gốc",
                "copy_link_url": "",
            },
        ],
    },
    {
        "chapter_label": "CHAPTER IV",
        "title": "Giáo Trình Thiên Tinh Trạch Nhật",
        "subtitle": "",
        "price_label": "35 linh thạch",
        "display_type": "featured",
        "icon": "star_rate",
        "items": [
            {
                "title": "",
                "demo_url": "https://drive.google.com/file/d/1skharPPUSPnFTXavWqLGEMIUHSZR4TIS/view?usp=share_link",
                "demo_label": "Mở Demo Nghiên Cứu",
                "copy_link_url": "",
            },
        ],
    },
    {
        "chapter_label": "CHAPTER V",
        "title": "Tam hợp hình phái (3 cuốn 2000 trang)",
        "subtitle": "3 cuốn - 2000 trang",
        "price_label": "150 linh thạch",
        "display_type": "accordion",
        "icon": "",
        "items": [
            {
                "title": "5.1. Chân quyết tam hợp hình phái (1+2)",
                "demo_url": "https://drive.google.com/file/d/1QIiNmmyQ_fU0k3W6Er1vlIQppwT_jKKL/view?usp=share_link",
                "demo_label": "XEM DEMO",
                "copy_link_url": "",
            },
            {
                "title": "Hình Loan Giảng Nghĩa: Tầm Long Điểm Huyệt Bí Pháp",
                "demo_url": "https://drive.google.com/file/d/1wk6h466PoTKY5J6OhHzLU92GZFZ3N7-f/view?usp=share_link",
                "demo_label": "XEM DEMO",
                "copy_link_url": "",
            },
        ],
    },
    {
        "chapter_label": "CHAPTER VI",
        "title": "Series sách kỳ môn từ cơ bản đến cao cấp ứng dụng",
        "subtitle": "Tuyển tập tinh hoa Kỳ Môn Độn Giáp ứng dụng",
        "price_label": "",
        "display_type": "accordion",
        "icon": "",
        "items": [
            {
                "title": "6.1. Kỳ môn độn giáp đại toàn (2 tập 1) (dương bàn) — 80 linh thạch\nDemo tập 1",
                "demo_url": "https://drive.google.com/file/d/1zjEpprTYH3t9NUrRA77TjRQ0A2SPTTmF/view?usp=share_link",
                "demo_label": "XEM DEMO TẬP 1",
                "copy_link_url": "",
            },
            {
                "title": "6.1. Kỳ môn độn giáp đại toàn (2 tập 1) (dương bàn)\nDemo tập 2",
                "demo_url": "https://drive.google.com/file/d/1vsHbjnB_dHLcDYgkK9DfdyJVP107p4vX/view?usp=share_link",
                "demo_label": "XEM DEMO TẬP 2",
                "copy_link_url": "",
            },
            {
                "title": "6.2. Kỳ môn độn giáp âm bàn đại toàn (thượng+hạ - 2000 trang) — 300 linh thạch",
                "demo_url": "https://drive.google.com/file/d/18ujWtp5pi6Z5bGiXMfaLMfZnADLjWA6_/view?usp=share_link",
                "demo_label": "XEM DEMO",
                "copy_link_url": "",
            },
            {
                "title": "6.3. Kỳ môn phong thuỷ tập 1 — 65 linh thạch",
                "demo_url": "https://drive.google.com/file/d/1diN7VZoyJ6OABPldk8iw_6NXsNPy64JH/view?usp=share_link",
                "demo_label": "XEM DEMO",
                "copy_link_url": "",
            },
            {
                "title": "6.4. Kỳ môn phong thuỷ đinh tài quý — 35 linh thạch",
                "demo_url": "https://drive.google.com/file/d/17CrMPQ7hsOX18LdroLL_ft1YPP2Se8eh/view?usp=share_link",
                "demo_label": "XEM DEMO",
                "copy_link_url": "",
            },
            {
                "title": "6.5. Kỳ môn thất tinh bắc đẩu — 25 linh thạch",
                "demo_url": "https://drive.google.com/file/d/1bn9c5ryrnVblUvJ9HKmBNRpPH27dTmbN/view?usp=share_link",
                "demo_label": "XEM DEMO",
                "copy_link_url": "",
            },
        ],
    },
]

PAGE_DEFAULTS = {
    "tag_label": "Lưu Hành Nội Bộ",
    "headline": "Demo các bộ sách huyền học mà bạn không thể bỏ qua",
    "sidebar_qr_image": "",
    "sidebar_zalo_url": "https://zalo.me/0963996863",
    "is_active": True,
}


class Command(BaseCommand):
    help = "Seed BookIntroPage with initial chapter and item data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete existing BookIntroPage before seeding.",
        )

    def handle(self, *args, **options):
        if options["reset"]:
            deleted, _ = BookIntroPage.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"Deleted {deleted} existing BookIntroPage record(s)."))

        if BookIntroPage.objects.exists():
            self.stdout.write(self.style.ERROR(
                "BookIntroPage already exists. Use --reset to overwrite."
            ))
            return

        # Filter out items with empty demo_url before saving
        # (items 1.3 and 2.3 are gift books with no demo link — keep them but mark clearly)
        page = BookIntroPage(chapters=CHAPTERS_DATA, **PAGE_DEFAULTS)
        page.full_clean()
        page.save()

        chapter_count = len(CHAPTERS_DATA)
        item_count = sum(len(c["items"]) for c in CHAPTERS_DATA)
        self.stdout.write(self.style.SUCCESS(
            f"BookIntroPage created: {chapter_count} chapters, {item_count} items."
        ))
