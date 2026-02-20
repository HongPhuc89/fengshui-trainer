# Feature 7 Detailed Design: Wallet & Payment Bridge

## 1. Core Data Structures & Models

### 1.1 Wallet Model
Tracks the "Linh Thạch" (LT) balance for each user.

```python
class Wallet(BaseModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='wallet')
    balance = models.PositiveIntegerField(default=0, help_text="Current Linh Thạch balance")
    total_recharged = models.PositiveIntegerField(default=0, help_text="Lifetime recharged amount")
    
    def __str__(self):
        return f"{self.user.username}'s Wallet - Balance: {self.balance} LT"
```

### 1.2 Voucher Model
Pre-generated codes sold externally. Users redeem these to get LT.

| Field | Type | Description |
| :--- | :--- | :--- |
| `code` | CharField(20, unique=True) | Alphanumeric redemption code (e.g., `VIP-X59A-12BF`). |
| `value` | PositiveIntegerField | Amount of LT granted upon redemption. |
| `is_used` | BooleanField(default=False) | Status of the voucher. |
| `used_by` | ForeignKey(User, null=True) | User who redeemed the voucher. |
| `used_at` | DateTimeField(null=True) | When it was redeemed. |
| `expires_at` | DateTimeField(null=True) | Expiration date of the voucher. |

### 1.3 WalletTransaction Model
Audit log for **every** change in Wallet balance.

| Field | Type | Description |
| :--- | :--- | :--- |
| `wallet` | ForeignKey(Wallet) | Target wallet. |
| `amount` | IntegerField | Positive for recharge/refund, Negative for purchase. |
| `transaction_type` | ChoiceField | `RECHARGE_VOUCHER`, `PURCHASE_BOOK`, `PURCHASE_VIDEO`, `ADMIN_EDIT`, `VIP_SUBSCRIPTION`. |
| `reference_id` | CharField | E.g., Voucher code, Book ID, or Admin Audit Log ID. |
| `description` | CharField(255) | Human-readable explanation. |
| `balance_after` | PositiveIntegerField | Snapshot of the balance after this transaction. |

---

## 2. Business Flow & Logic

### 2.1 Voucher Redemption Flow
1. **User Action**: Enters code in App/Web.
2. **API Logic**: 
   - Check if `Voucher` exists, `is_used=False`, and `expires_at > now()`.
   - Start Database Transaction (`transaction.atomic()`).
   - Mark `Voucher.is_used = True`, `used_by = current_user`, `used_at = now()`.
   - Update `Wallet.balance += Voucher.value` and `Wallet.total_recharged += Voucher.value`.
   - Create `WalletTransaction` (Type: `RECHARGE_VOUCHER`).
3. **Result**: User's balance increases instantly.

### 2.2 Content Purchase Flow (Pay-per-course/book)
1. **User Action**: Clicks "Buy with X LT".
2. **API Logic**:
   - Check if User already owns the item (prevent duplicate purchase).
   - Check if `Wallet.balance >= Item.price`. If not, return `INSUFFICIENT_FUNDS`.
   - Start Database Transaction (`transaction.atomic()`).
   - Deduct balance: `Wallet.balance -= Item.price`.
   - Create `WalletTransaction` (Type: `PURCHASE_BOOK` or `PURCHASE_VIDEO`).
   - Create `UserBookPurchase` or `UserVideoPurchase` record.
3. **Result**: Content unlocks, balance decreases.

### 2.3 VIP Subscription Flow
Similar to Content Purchase, but instead of unlocking specific items, it extends the `User.subscription_end_date` and changes `User.user_type` to `VIP` if they were `FREE`.

---

## 3. Security & Admin Integrations

### 3.1 Admin Wallet Editing
If an Admin manually edits a user's `Wallet.balance` via the Django Admin interface:
1. It must be intercepted (via `ModelAdmin.save_model` or signals).
2. A `WalletTransaction` (Type: `ADMIN_EDIT`) must be created.
3. An `AdminAuditLog` must be created tracking the exact amounts and the staff member who made the change.

### 3.2 Bulk Voucher Generation
Admin action to generate `N` vouchers of `V` value:
- Generates secure random strings without ambiguous characters (e.g., exclude `0`, `O`, `1`, `I`).
- Outputs a downloadable CSV for the marketing/sales team.

---

## 4. API Endpoints

| Endpoint | Method | Auth Required | Logic |
| :--- | :--- | :--- | :--- |
| `/api/wallet/me/` | GET | Yes | Get current balance and total recharged. |
| `/api/wallet/redeem/` | POST | Yes | `{ "code": "ABC-123" }` -> Redeems and returns new balance. |
| `/api/wallet/history/` | GET | Yes | Paginated list of User's `WalletTransaction`s. |
| `/api/payments/purchase-book/` | POST | Yes | `{ "book_id": "uuid" }` -> Deducts LT, grants book access. |
| `/api/payments/purchase-video/` | POST | Yes | `{ "video_id": "uuid" }` -> Deducts LT, grants video access. |
| `/api/payments/subscribe-vip/` | POST | Yes | `{ "months": 1 }` -> Deducts LT, extends VIP status. |

---
*Last updated: 2026-02-20*
