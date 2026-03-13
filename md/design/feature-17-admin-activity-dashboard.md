# Feature 17: Admin Activity Dashboard — DAU & Linh Thạch theo ngày

**Ngày tạo:** 2026-03-13
**Cập nhật:** 2026-03-13
**Status:** 📝 Design
**Priority:** High
**Effort ước tính:** S (~2 ngày: BE 1.5 ngày + Test 0.5 ngày)
**Stack:** Backend only (Django Admin) + DB (PostgreSQL)

---

## Mục tiêu

Admin Thiên Thư có thể xem hai nhóm số liệu theo ngày trong một date range tùy chọn **trực tiếp trong Django Admin**:

1. **User Activity**: DAU (Daily Active Users), đăng ký mới, lượt mua nội dung.
2. **Linh Thạch Economy**: LT nạp vào, LT tiêu ra, voucher đổi, breakdown chi tiêu theo loại nội dung.

Dashboard được implement như **Django Admin custom view** — không cần frontend riêng (Vue.js).

---

## Scope V1

### Làm trong V1

- **Date range picker**: mặc định 30 ngày gần nhất, preset 7 / 30 / 90 ngày + custom (HTML form).
- **Summary cards (KPI tiles)**: tóm tắt toàn period.
- **Raw data table**: bảng số liệu theo ngày trong Django Admin template.
- **Timezone**: quy đổi về UTC+7 (Vietnam) khi group by ngày.
- **Permission**: chỉ user có `is_staff=True` (Django Admin mặc định enforce).

### Không làm trong V1 (để V2)

- Charts / visualizations.
- Export CSV.
- Realtime / auto-refresh.
- Cohort analysis / churn indicator.
- Per-user drill-down.
- Delta % so với period trước.
- VND conversion.
- Email report hàng tuần.

---

## Database

**Không cần migration mới** — tất cả data đã có trong các model hiện tại.

Các model được tận dụng:

| Metric | Model | Field dùng để group/filter |
|--------|-------|---------------------------|
| DAU | `UserLessonProgress` + `UserChapterProgress` | `last_watched` / `last_read` — UNION unique `user_id` per day |
| New registrations | `User` (Django AbstractUser + BaseModel) | `created_at` |
| New purchases (total) | `UserBookPurchase` + `UserCoursePurchase` | `purchased_at` / `created_at` |
| LT recharged | `WalletTransaction` | `created_at`, `transaction_type IN ('RECHARGE_VOUCHER', 'ADMIN_TOPUP')`, `SUM(amount)` |
| LT spent | `WalletTransaction` | `created_at`, `amount < 0`, `SUM(ABS(amount))` |
| Vouchers redeemed | `Voucher` | `used_at` (`is_used=True`), `COUNT(*)` per day |
| Revenue by content type | `WalletTransaction` | `transaction_type` GROUP BY (`PURCHASE_BOOK`, `PURCHASE_VIDEO`, `VIP_SUBSCRIPTION`) |

**Index cần thêm** để query nhanh trên date range lớn:

```python
# wallet/models/transaction.py — thêm vào Meta
class Meta:
    indexes = [
        models.Index(fields=['created_at', 'transaction_type'], name='wt_created_type_idx'),
    ]

# wallet/models/voucher.py — thêm vào Meta
class Meta:
    indexes = [
        models.Index(fields=['used_at'], name='voucher_used_at_idx'),
    ]

# videos/models.py — UserLessonProgress
class Meta:
    indexes = [
        models.Index(fields=['last_watched'], name='ulp_last_watched_idx'),
    ]

# books/models.py — UserChapterProgress
class Meta:
    indexes = [
        models.Index(fields=['last_read'], name='ucp_last_read_idx'),
    ]
```

> Nếu chưa có các index này, tạo migration riêng chỉ thêm index (không thay đổi schema).

---

## Backend (Django Admin)

### Approach

Dùng **Django Admin custom view** — thêm URL vào `AdminSite` và render template HTML với context từ query Django ORM.

Không dùng DRF API endpoint — dashboard render server-side, không cần JSON response.

### Implementation

**App location:** Đặt trong `users` app (gần user management).

**File structure:**
```
src/backend/users/
├── admin_stats.py          ← query logic (tách riêng để dễ test)
├── admin_views.py          ← Django Admin custom views (2 views)

src/backend/templates/admin/stats/
├── activity_dashboard.html ← template cho activity + revenue dashboard
```

### Query Logic (`admin_stats.py`)

```python
# users/admin_stats.py
from collections import defaultdict
from datetime import date, timedelta
import pytz

from django.db.models import Count, Sum
from django.db.models.functions import TruncDate

VN_TZ = pytz.timezone('Asia/Ho_Chi_Minh')


def get_activity_stats(start_date: date, end_date: date) -> dict:
    """
    Returns DAU, registrations, purchases per day + summary totals.
    """
    from videos.models import UserLessonProgress
    from books.models import UserChapterProgress
    from django.contrib.auth import get_user_model
    from books.models import UserBookPurchase
    from videos.models import UserCoursePurchase

    User = get_user_model()

    # --- DAU: unique users with lesson or chapter activity ---
    lesson_pairs = set(
        UserLessonProgress.objects
        .filter(last_watched__date__range=(start_date, end_date))
        .annotate(day=TruncDate('last_watched', tzinfo=VN_TZ))
        .values_list('day', 'user_id')
        .distinct()
    )
    chapter_pairs = set(
        UserChapterProgress.objects
        .filter(last_read__date__range=(start_date, end_date))
        .annotate(day=TruncDate('last_read', tzinfo=VN_TZ))
        .values_list('day', 'user_id')
        .distinct()
    )
    all_pairs = lesson_pairs | chapter_pairs
    dau_per_day = defaultdict(set)
    for day, user_id in all_pairs:
        dau_per_day[day].add(user_id)

    # --- Registrations per day ---
    reg_qs = (
        User.objects
        .filter(created_at__date__range=(start_date, end_date))
        .annotate(day=TruncDate('created_at', tzinfo=VN_TZ))
        .values('day')
        .annotate(count=Count('id'))
    )
    reg_per_day = {row['day']: row['count'] for row in reg_qs}

    # --- Purchases per day (book + course) ---
    book_qs = (
        UserBookPurchase.objects
        .filter(purchased_at__date__range=(start_date, end_date))
        .annotate(day=TruncDate('purchased_at', tzinfo=VN_TZ))
        .values('day')
        .annotate(count=Count('id'))
    )
    course_qs = (
        UserCoursePurchase.objects
        .filter(created_at__date__range=(start_date, end_date))
        .annotate(day=TruncDate('created_at', tzinfo=VN_TZ))
        .values('day')
        .annotate(count=Count('id'))
    )
    purchase_per_day = defaultdict(int)
    for row in book_qs:
        purchase_per_day[row['day']] += row['count']
    for row in course_qs:
        purchase_per_day[row['day']] += row['count']

    # --- Build daily list ---
    all_days = sorted(set(dau_per_day) | set(reg_per_day) | set(purchase_per_day))
    daily = []
    for day in all_days:
        daily.append({
            'date': day,
            'dau': len(dau_per_day.get(day, set())),
            'new_registrations': reg_per_day.get(day, 0),
            'new_purchases': purchase_per_day.get(day, 0),
        })

    return {
        'daily': daily,
        'summary': {
            'total_dau': sum(r['dau'] for r in daily),
            'total_registrations': sum(r['new_registrations'] for r in daily),
            'total_purchases': sum(r['new_purchases'] for r in daily),
        },
    }


def get_revenue_stats(start_date: date, end_date: date) -> dict:
    """
    Returns LT recharged, spent, vouchers redeemed, breakdown per day + summary totals.
    """
    from wallet.models import WalletTransaction, Voucher

    # --- LT recharged per day ---
    recharged_qs = (
        WalletTransaction.objects
        .filter(
            created_at__date__range=(start_date, end_date),
            transaction_type__in=['RECHARGE_VOUCHER', 'ADMIN_TOPUP'],
        )
        .annotate(day=TruncDate('created_at', tzinfo=VN_TZ))
        .values('day')
        .annotate(total=Sum('amount'))
    )
    recharged_per_day = {row['day']: row['total'] or 0 for row in recharged_qs}

    # --- LT spent per day (amount < 0) ---
    spent_qs = (
        WalletTransaction.objects
        .filter(
            created_at__date__range=(start_date, end_date),
            amount__lt=0,
        )
        .annotate(day=TruncDate('created_at', tzinfo=VN_TZ))
        .values('day')
        .annotate(total=Sum('amount'))
    )
    spent_per_day = {row['day']: abs(row['total'] or 0) for row in spent_qs}

    # --- Vouchers redeemed per day ---
    voucher_qs = (
        Voucher.objects
        .filter(
            used_at__date__range=(start_date, end_date),
            is_used=True,
        )
        .annotate(day=TruncDate('used_at', tzinfo=VN_TZ))
        .values('day')
        .annotate(count=Count('id'))
    )
    voucher_per_day = {row['day']: row['count'] for row in voucher_qs}

    # --- Revenue breakdown per day per type ---
    breakdown_qs = (
        WalletTransaction.objects
        .filter(
            created_at__date__range=(start_date, end_date),
            transaction_type__in=['PURCHASE_BOOK', 'PURCHASE_VIDEO', 'VIP_SUBSCRIPTION'],
            amount__lt=0,
        )
        .annotate(day=TruncDate('created_at', tzinfo=VN_TZ))
        .values('day', 'transaction_type')
        .annotate(total=Sum('amount'))
    )
    breakdown_per_day = defaultdict(lambda: {'purchase_book': 0, 'purchase_video': 0, 'vip_subscription': 0})
    for row in breakdown_qs:
        key = row['transaction_type'].lower()
        breakdown_per_day[row['day']][key] = abs(row['total'] or 0)

    # --- Build daily list ---
    all_days = sorted(set(recharged_per_day) | set(spent_per_day) | set(voucher_per_day) | set(breakdown_per_day))
    daily = []
    for day in all_days:
        daily.append({
            'date': day,
            'lt_recharged': recharged_per_day.get(day, 0),
            'lt_spent': spent_per_day.get(day, 0),
            'vouchers_redeemed': voucher_per_day.get(day, 0),
            'breakdown': breakdown_per_day.get(day, {'purchase_book': 0, 'purchase_video': 0, 'vip_subscription': 0}),
        })

    return {
        'daily': daily,
        'summary': {
            'total_lt_recharged': sum(r['lt_recharged'] for r in daily),
            'total_lt_spent': sum(r['lt_spent'] for r in daily),
            'total_vouchers_redeemed': sum(r['vouchers_redeemed'] for r in daily),
        },
    }
```

### Admin Views (`admin_views.py`)

```python
# users/admin_views.py
from datetime import date, timedelta
from django.contrib.admin.views.decorators import staff_member_required
from django.shortcuts import render
from django.utils.decorators import method_decorator
from django.views import View

from .admin_stats import get_activity_stats, get_revenue_stats

MAX_RANGE_DAYS = 365
DEFAULT_RANGE_DAYS = 30


@method_decorator(staff_member_required, name='dispatch')
class ActivityDashboardView(View):
    template_name = 'admin/stats/activity_dashboard.html'

    def get(self, request):
        today = date.today()
        # Parse date params
        try:
            start_date = date.fromisoformat(request.GET.get('start_date', ''))
        except (ValueError, TypeError):
            start_date = today - timedelta(days=DEFAULT_RANGE_DAYS - 1)

        try:
            end_date = date.fromisoformat(request.GET.get('end_date', ''))
        except (ValueError, TypeError):
            end_date = today

        # Validate range
        if end_date < start_date:
            start_date, end_date = end_date, start_date
        if (end_date - start_date).days > MAX_RANGE_DAYS:
            start_date = end_date - timedelta(days=MAX_RANGE_DAYS)

        activity = get_activity_stats(start_date, end_date)
        revenue = get_revenue_stats(start_date, end_date)

        context = {
            **self.admin_site.each_context(request),
            'title': 'Thống kê hoạt động',
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'activity_summary': activity['summary'],
            'revenue_summary': revenue['summary'],
            'daily_rows': _merge_daily(activity['daily'], revenue['daily']),
        }
        return render(request, self.template_name, context)

    # admin_site reference injected when registering URL
    admin_site = None


def _merge_daily(activity_daily, revenue_daily):
    """Merge activity and revenue daily lists by date into one list for the table."""
    rev_map = {r['date']: r for r in revenue_daily}
    act_map = {r['date']: r for r in activity_daily}
    all_days = sorted(set(act_map) | set(rev_map), reverse=True)
    rows = []
    for day in all_days:
        act = act_map.get(day, {})
        rev = rev_map.get(day, {})
        rows.append({
            'date': day,
            'dau': act.get('dau', 0),
            'new_registrations': act.get('new_registrations', 0),
            'new_purchases': act.get('new_purchases', 0),
            'lt_recharged': rev.get('lt_recharged', 0),
            'lt_spent': rev.get('lt_spent', 0),
            'vouchers_redeemed': rev.get('vouchers_redeemed', 0),
            'book_spend': rev.get('breakdown', {}).get('purchase_book', 0),
            'video_spend': rev.get('breakdown', {}).get('purchase_video', 0),
            'vip_spend': rev.get('breakdown', {}).get('vip_subscription', 0),
        })
    return rows
```

### Đăng ký URL trong Admin Site

```python
# users/admin.py (hoặc config/admin.py nếu có AdminSite tùy chỉnh)
from django.contrib import admin
from .admin_views import ActivityDashboardView

# Gắn admin_site reference vào view
activity_view = ActivityDashboardView.as_view()
# Inject admin site (cần nếu dùng each_context)
# Đơn giản hơn: dùng custom AdminSite hoặc monkey-patch sau khi admin.site setup

def get_admin_urls(urls):
    from django.urls import path
    custom_urls = [
        path('stats/activity/', admin.site.admin_view(ActivityDashboardView.as_view()), name='stats-activity'),
    ]
    return custom_urls + urls

# Trong AppConfig.ready() hoặc trực tiếp trong urls.py:
# admin.site.get_urls() sẽ tự include qua override
```

**Cách đơn giản nhất** — override `get_urls()` trong custom AdminSite hoặc dùng monkey-patch:

```python
# config/urls.py — thêm trước path('admin/', ...)
from django.contrib import admin
from users.admin_views import ActivityDashboardView

# Thêm custom URL vào admin site
original_get_urls = admin.site.__class__.get_urls

def patched_get_urls(self):
    from django.urls import path
    custom = [
        path('stats/activity/', self.admin_view(ActivityDashboardView.as_view()), name='admin-stats-activity'),
    ]
    return custom + original_get_urls(self)

admin.site.__class__.get_urls = patched_get_urls
```

Hoặc dùng cách sạch hơn — subclass `AdminSite` (xem Implementation Notes bên dưới).

### Template (`activity_dashboard.html`)

Template kế thừa `admin/base_site.html` để có đầy đủ Django Admin UI:

```html
{% extends "admin/base_site.html" %}
{% block content %}

<!-- Date range form -->
<form method="get">
  <input type="date" name="start_date" value="{{ start_date }}">
  <input type="date" name="end_date" value="{{ end_date }}">
  <button type="submit">Xem</button>
  <!-- Preset buttons -->
  <a href="?start_date={{ preset_7_start }}&end_date={{ end_date }}">7 ngày</a>
  <a href="?start_date={{ preset_30_start }}&end_date={{ end_date }}">30 ngày</a>
  <a href="?start_date={{ preset_90_start }}&end_date={{ end_date }}">90 ngày</a>
</form>

<!-- KPI Summary cards -->
<div class="stats-summary">
  <div>DAU tổng: {{ activity_summary.total_dau }}</div>
  <div>Đăng ký mới: {{ activity_summary.total_registrations }}</div>
  <div>Mua nội dung: {{ activity_summary.total_purchases }}</div>
  <div>LT nạp: {{ revenue_summary.total_lt_recharged }}</div>
  <div>LT tiêu: {{ revenue_summary.total_lt_spent }}</div>
  <div>Voucher dùng: {{ revenue_summary.total_vouchers_redeemed }}</div>
</div>

<!-- Raw data table -->
<table>
  <thead>
    <tr>
      <th>Ngày</th>
      <th>DAU</th>
      <th>Đăng ký mới</th>
      <th>Mua mới</th>
      <th>LT nạp</th>
      <th>LT tiêu</th>
      <th>Voucher</th>
      <th>Chi sách</th>
      <th>Chi video</th>
      <th>Chi VIP</th>
    </tr>
  </thead>
  <tbody>
    {% for row in daily_rows %}
    <tr>
      <td>{{ row.date }}</td>
      <td>{{ row.dau }}</td>
      <td>{{ row.new_registrations }}</td>
      <td>{{ row.new_purchases }}</td>
      <td>{{ row.lt_recharged }}</td>
      <td>{{ row.lt_spent }}</td>
      <td>{{ row.vouchers_redeemed }}</td>
      <td>{{ row.book_spend }}</td>
      <td>{{ row.video_spend }}</td>
      <td>{{ row.vip_spend }}</td>
    </tr>
    {% empty %}
    <tr><td colspan="10">Không có dữ liệu trong khoảng thời gian này.</td></tr>
    {% endfor %}
  </tbody>
</table>
{% endblock %}
```

### Implementation Notes

**Cách đăng ký URL vào Django Admin (khuyến nghị):**

Option A — Override `get_urls` trên `AdminSite` instance (production-safe, không monkey-patch):

```python
# users/admin.py
from django.contrib import admin
from django.urls import path
from .admin_views import ActivityDashboardView

class CustomAdminSite(admin.AdminSite):
    def get_urls(self):
        custom_urls = [
            path('stats/activity/', self.admin_view(ActivityDashboardView.as_view()), name='stats-activity'),
        ]
        return custom_urls + super().get_urls()

# Nếu dự án đang dùng admin.site default (chưa có CustomAdminSite),
# có thể inject trực tiếp qua monkey-patch trong AppConfig.ready().
```

Option B — Monkey-patch trong `users/apps.py` `ready()` (đơn giản, ít xâm lấn):

```python
# users/apps.py
from django.apps import AppConfig

class UsersConfig(AppConfig):
    name = 'users'

    def ready(self):
        from django.contrib import admin
        from django.urls import path
        from .admin_views import ActivityDashboardView

        original_get_urls = admin.site.__class__.get_urls

        def patched_get_urls(self):
            custom = [
                path('stats/activity/', self.admin_view(ActivityDashboardView.as_view()), name='admin-stats-activity'),
            ]
            return custom + original_get_urls(self)

        admin.site.__class__.get_urls = patched_get_urls
```

**`each_context`:** Để template Django Admin render đúng sidebar/header, view cần truy cập `admin.site.each_context(request)`. Vì view là class-based view thông thường (không phải ModelAdmin), cần import `admin.site` trực tiếp trong view:

```python
from django.contrib import admin

class ActivityDashboardView(View):
    def get(self, request):
        context = {
            **admin.site.each_context(request),
            ...
        }
```

**Validation:**
- `start_date` và `end_date` parse từ GET params, fallback về default nếu invalid.
- `end_date >= start_date` — swap nếu ngược.
- Range tối đa 365 ngày.

**Timezone handling:**
- Dùng `TruncDate('field', tzinfo=VN_TZ)` để group đúng theo giờ VN (UTC+7).

**DAU merge strategy:**
- Fetch `(day, user_id)` distinct từ 2 bảng (lesson + chapter), combine thành Python set, count per day.
- OK với dataset nhỏ (< 5K DAU × 30 ngày ~ 150K rows).

**Navigation link (optional):**
- Có thể thêm link "Thống kê" vào Django Admin index page bằng cách override `index.html` template hoặc dùng package `django-admin-tools`.
- V1: truy cập trực tiếp qua URL `/admin/stats/activity/`.

---

## Migration

**Không cần migration schema mới** — feature dùng hoàn toàn existing data.

Cần tạo **1 migration chỉ thêm index** (không thay đổi schema) cho các bảng sau nếu chưa có:

```python
# users/migrations/XXXX_add_admin_stats_indexes.py
# books/migrations/XXXX_add_admin_stats_indexes.py
# videos/migrations/XXXX_add_admin_stats_indexes.py
# wallet/migrations/XXXX_add_admin_stats_indexes.py
```

Kiểm tra migration hiện có trước khi tạo — một số index có thể đã tồn tại.

---

## Files cần tạo/sửa

| File | Action | Nội dung |
|------|--------|---------|
| `src/backend/users/admin_stats.py` | CREATE | `get_activity_stats()`, `get_revenue_stats()` — pure query functions |
| `src/backend/users/admin_views.py` | CREATE | `ActivityDashboardView` (staff_member_required), `_merge_daily()` |
| `src/backend/users/apps.py` | MODIFY | `ready()`: đăng ký custom URL vào `admin.site` |
| `src/backend/templates/admin/stats/activity_dashboard.html` | CREATE | Template kế thừa `admin/base_site.html`, date form + KPI cards + table |
| `src/backend/*/migrations/XXXX_add_stats_indexes.py` | CREATE | Migration thêm index cho `created_at`, `last_watched`, `last_read`, `used_at` |

**Không cần thay đổi:**
- `config/urls.py` — admin URL tự inject qua `get_urls()` override.
- Frontend (Vue.js) — không liên quan.

---

## Checklist implement

### Backend

- [ ] Tạo `users/admin_stats.py`
  - [ ] `get_activity_stats(start_date, end_date)`: DAU (merge lesson + chapter), registrations, purchases
  - [ ] `get_revenue_stats(start_date, end_date)`: LT recharged, spent, vouchers, breakdown
- [ ] Tạo `users/admin_views.py`
  - [ ] `ActivityDashboardView`: parse + validate params, call stats functions, render template
  - [ ] `_merge_daily()`: merge activity + revenue daily lists by date
- [ ] Sửa `users/apps.py`: đăng ký URL `/admin/stats/activity/` vào admin site trong `ready()`
- [ ] Tạo `templates/admin/stats/activity_dashboard.html`
  - [ ] Date range form (start/end input + preset links: 7/30/90 ngày)
  - [ ] KPI summary cards (DAU tổng, đăng ký, mua, LT nạp, LT tiêu, voucher)
  - [ ] Raw data table (date | DAU | registrations | purchases | LT in | LT out | vouchers | book/video/VIP spend)
  - [ ] Empty state: "Không có dữ liệu trong khoảng thời gian này."
- [ ] Kiểm tra/tạo migration thêm index (verify chưa tồn tại trước)
- [ ] Test thủ công: truy cập `/admin/stats/activity/` với staff account

---

## Trade-off & Lưu ý

### Performance

- **Query thực tế:** 6–8 queries Django ORM per page load. Với dataset < 10K users, mỗi query < 50ms. Tổng dự kiến < 400ms cho range 30 ngày.
- **DAU merge in Python:** ~30K rows tối đa cho 30 ngày × 1K DAU — acceptable.
- **Max range 365 ngày:** Guard tránh query toàn bộ DB history.

### Không cần DRF

Vì không có frontend tiêu thụ API, không cần tạo DRF serializers hay API endpoints. View render HTML trực tiếp, đơn giản hơn.

### Security

`admin_view()` wrapper của Django tự enforce `is_staff=True` và redirect về login nếu chưa authenticate. Không cần thêm permission check thủ công.

### UserBookPurchase.purchased_at vs UserCoursePurchase.created_at

`UserBookPurchase` có field `purchased_at`, `UserCoursePurchase` extends `BaseModel` nên dùng `created_at`. Verify tên field đúng khi implement.

### V2 — Pre-aggregation + Charts

Khi DAU > 5,000 hoặc cần visualizations:
- Thêm Chart.js vào Django Admin template (CDN, không cần npm).
- Hoặc tách thành Vue.js dashboard riêng nếu UX phức tạp hơn.
- Celery task aggregate metrics vào bảng `DailyMetrics` cho query nhanh hơn.

---

## Open Questions (cần confirm với PO trước khi implement)

1. **LT → VND conversion:** 1 LT = X VND cố định không? Nếu có, thêm cột "~ VND" trong table.
2. **Navigation:** Dashboard truy cập qua URL trực tiếp (`/admin/stats/activity/`) hay muốn thêm link vào Django Admin index?
3. **VIP activations:** Có muốn thêm count `VIP_SUBSCRIPTION` transactions per day không? (~10 dòng query thêm.)

---

*Design doc này cover V1 only — Django Admin server-rendered. V2 có thể thêm charts (Chart.js CDN trong template) hoặc tách Vue.js dashboard nếu cần UX phức tạp hơn.*
