# Book Purchase Flow — Mua Sách & Mở Chapter

**Ngày đề xuất:** 2026-03-12
**Nguồn cảm hứng:** Goodnovel, Wattpad, Tapas — pay-per-chapter reading apps + Django concurrency best practices
**Độ ưu tiên gợi ý:** 🔴 High
**Effort ước tính:** M

---

## Vấn đề / Cơ hội

Hiện tại sách có phí **không mua được** từ frontend vì chưa có `BookDetailView.vue`. Người dùng click vào sách trả phí trên `BooksView` thì nhảy thẳng vào `BookReaderView` nhưng bị chặn 403 khi mở chapter có phí — không có UI để mua.

Thêm vào đó, backend `PurchaseBookView` dùng `transaction.atomic()` nhưng **không có `select_for_update()`** trên wallet row, tạo race condition: hai request đồng thời đều pass balance check và trừ tiền hai lần.

## Ý tưởng tính năng

### UX Flow tổng thể

```
BooksView (danh sách) → click sách
    ├── Sách miễn phí / đã mua → BookReaderView trực tiếp (giữ nguyên)
    └── Sách trả phí chưa mua → BookDetailView (mới)
            ├── Hiển thị: cover, mô tả, tác giả, giá, số chapter
            ├── Danh sách chapter:
            │     ├── Chapter is_demo=True  → [Đọc thử] → BookReaderView
            │     └── Chapter is_demo=False → [🔒 Trả phí] → Purchase Modal
            └── Nút CTA chính: "Mua sách — X Linh Thạch"
```

### Purchase Modal khi click chapter có phí

```
┌─────────────────────────────────────────┐
│  Mở khóa toàn bộ sách                   │
│  "Tên Sách"                              │
│                                         │
│  Giá: 500 Linh Thạch                    │
│  Số dư hiện tại: 800 LT  ✅             │
│  Sau khi mua còn: 300 LT                │
│                                         │
│  [Huỷ]          [Xác nhận mua]          │
└─────────────────────────────────────────┘

Nếu số dư < giá:
│  Số dư hiện tại: 200 LT  ❌ Không đủ   │
│  Cần thêm: 300 LT                       │
│  [Huỷ]          [Nạp Linh Thạch →]     │
└─────────────────────────────────────────┘
```

### Logic backend — Wallet Locking (fix race condition)

**Vấn đề hiện tại** (`views_payments.py`):
```python
wallet = get_or_create_wallet(user)
if wallet.balance < price:          # ← balance check OUTSIDE transaction
    return INSUFFICIENT_FUNDS
with transaction.atomic():
    wallet.balance -= price         # ← race: hai request cùng check → cùng pass
    wallet.save()
```

**Fix đúng** — lock wallet row trước khi check:
```python
with transaction.atomic():
    wallet = Wallet.objects.select_for_update().get(user=user)  # ← LOCK
    if wallet.balance < price:
        return INSUFFICIENT_FUNDS
    wallet.balance -= price
    wallet.save()
    # ... tạo transaction record, UserBookPurchase
```

`select_for_update()` đặt exclusive row lock (PostgreSQL `SELECT ... FOR UPDATE`), chặn mọi concurrent transaction khác trên cùng wallet row cho đến khi commit.

## Tại sao phù hợp với Thiên Thư

- Platform dùng Linh Thạch (in-app currency) làm phương thức thanh toán duy nhất — wallet locking là critical để đảm bảo không thể double-spend.
- Mô hình "vài chapter đọc thử, trả phí để mở toàn bộ" là UX chuẩn của mọi reading platform (Goodnovel, Wattpad Paid Stories, Tapas): cho người dùng taste trước, convert sau.
- `BookChapter.is_demo` đã có sẵn trong model → chỉ cần FE hiển thị đúng, không cần migration.
- `POST /api/payments/purchase-book/` đã có sẵn → chỉ cần FE gọi đúng lúc + BE thêm locking.

## Inspiration từ market

- **Goodnovel / Dreame**: 3–8 chapter đọc thử, sau đó mua coin để unlock từng chapter hoặc mua cả book. UX rõ ràng với lock icon trên chapter list.
- **Wattpad Paid Stories**: Chapter đầu tiên free, các chapter trả phí hiển thị `🔒` + giá coin. Click → modal confirm → deduct.
- **Tapas**: Coins (Ink) hệ thống, mỗi episode có giá riêng, balance check trước khi cho đọc. Nếu không đủ coin → redirect trang nạp.
- **Django select_for_update()**: Best practice cho wallet/payment operations — lock row trước check balance, không check ngoài transaction.

## Scope gợi ý cho V1

### Backend (fix + enhancements):
- [ ] **[CRITICAL]** Thêm `select_for_update()` vào `PurchaseBookView`, `PurchaseVideoView`, `SubscribeVipView` trong `wallet/views_payments.py`
- [ ] Verify `BookDetailSerializer` trả `is_demo` cho từng chapter trong list chapters
- [ ] Verify `BookDetailWithPurchaseSerializer` trả `has_purchased` flag chính xác

### Frontend (new):
- [ ] Tạo `BookDetailView.vue` — book info + chapter list với locked/unlocked state
- [ ] `PurchaseBookModal.vue` component — hiển thị giá, balance, confirm/cancel
- [ ] Logic: nếu balance < price → hiển thị "Số dư không đủ" + nút redirect StoreView
- [ ] Cập nhật router: `/books/:slug` → `BookDetailView` (thay vì nhảy thẳng vào reader)
- [ ] Sau mua thành công → cập nhật wallet store balance + mở chapter được click
- [ ] Cập nhật `BooksView` navigation: click sách → `/books/:slug` (BookDetailView)

### UX states cần handle:
- [ ] Loading state khi đang mua (disable button, spinner)
- [ ] Error state: insufficient funds, network error, already purchased
- [ ] Success state: toast "Mua sách thành công! 🎉" + auto-navigate vào chapter

## Data flow chi tiết

```
BookDetailView mount:
  → GET /api/books/{slug}/   (auth)
  → response: { title, price_lt, is_free, has_purchased, chapters: [{order, title, is_demo}] }
  → walletStore.fetchBalance() nếu chưa load

Click chapter is_demo=True:
  → router.push('/books/{slug}/read', query: { chapter: order })

Click chapter is_demo=False, has_purchased=true:
  → router.push('/books/{slug}/read', query: { chapter: order })

Click chapter is_demo=False, has_purchased=false:
  → Mở PurchaseBookModal
  → User confirm → POST /api/payments/purchase-book/ { book_id }
  → Success → walletStore.balance -= price (optimistic) hoặc refetch
  → router.push('/books/{slug}/read', query: { chapter: order })
  → Error INSUFFICIENT_FUNDS → show message + nút "Đến Cửa Hàng"
```

## Open questions

- **Chapter-level pricing**: Hiện tại `price_lt` nằm trên `Book`, không có per-chapter price. Nếu về sau muốn per-chapter purchase (mua từng chapter), cần migration thêm `chapter_price_lt` vào `BookChapter` và endpoint mới. V1 chỉ làm whole-book purchase.
- **VIP access**: Người dùng VIP đã được access tất cả chapter (logic `_can_access_chapter` đã handle). BookDetailView cần show trạng thái "VIP — Đã mở khoá" để UX rõ ràng.
- **Transaction type cho chapter-unlock**: Có cần transaction type `PURCHASE_CHAPTER` riêng về sau không?

## Bước tiếp theo

- [ ] Chuyển sang PO review → `/project-owner-detail-design-review`
- [ ] Viết detail design → `md/design/feature-13-detail-design.md`
- [ ] **Implement ngay backend fix** (select_for_update) — critical bug, không cần design doc riêng
