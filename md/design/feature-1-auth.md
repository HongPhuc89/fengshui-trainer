# Feature 1 Detailed Design: User Management & Authentication

## 1. Core Data Structures & Models

### 1.1 BaseModel (Abstract)
All models in the system must inherit from this base to ensure consistency.

```python
class BaseModel(models.Model):
    id = models.BigAutoField(primary_key=True) # Private ID for joins
    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True) # Public ID for API
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
```

### 1.2 User Model
Extends `AbstractUser` to support phone-based auth and device locking.

| Field | Type | Description |
| :--- | :--- | :--- |
| `phone_number` | CharField(15, unique=True) | Primary login identifier. |
| `user_type` | CharField | `FREE`, `VIP`, `USER`. |
| `subscription_end` | DateTimeField | NULL for non-VIPs. |
| `is_device_locked` | BooleanField | If True, only allow login from bound devices. |
| `last_device_reset` | DateTimeField | Tracked for the 365-day cooldown. |

### 1.3 UserDevice Model
Tracks hardware fingerprints and binding status.

| Field | Type | Description |
| :--- | :--- | :--- |
| `user` | ForeignKey(User) | Relation to user. |
| `device_id` | CharField(255) | Hardware id / fingerprint. |
| `device_type` | ChoiceField | IOS, ANDROID, WEB. |
| `is_primary_bound` | BooleanField | Marks the "Hard Locked" device. |
| `status` | ChoiceField | `ACTIVE`, `REVOKED`. |

---

## 2. Authentication Flow & Logic

### 2.1 Registration Sequence
1.  **Input Validation**: Check phone uniqueness.
2.  **User Creation**: Create `User` record with `is_device_locked=False`.
3.  **Auto-Binding**: Capture `device_id` from the registration request and create the first `UserDevice` with `is_primary_bound=True`.
4.  **Token Issuance**: Return initial JWT (Access/Refresh).

### 2.2 Login & Device Verification (Hard Locking)
Every login request must pass through the `DeviceVerificationMiddleware` or a service validation:

```python
def validate_device(user, current_device_id):
    if not user.is_device_locked:
        return True # Not locked yet (e.g., first few logins or admin override)
    
    bound_device = user.devices.filter(is_primary_bound=True).first()
    if bound_device and bound_device.device_id != current_device_id:
        raise DeviceMismatchError("Tài khoản đã được khóa cho một thiết bị khác.")
    return True
```

### 2.3 JWT Strategy
- **Access Token**: 1 hour lifespan (Short-lived for security).
- **Refresh Token**: 30 days lifespan (Long-lived for UX, stored in secure storage on Mobile/Web).
- **Rotation**: On every refresh, issue a new Refresh Token (Refresh Token Rotation) to invalidate old ones.

---

## 3. Security & Audit Logging

### 3.1 AdminAuditLog Implementation
Sensitive actions (VIP upgrade, manual Linh Thạch edit, device un-link) must be logged via a signal listener:

```python
@receiver(post_save, sender=User)
def log_user_changes(sender, instance, created, **kwargs):
    if not created:
        # Check for user_type or balance changes (via Wallet model)
        # Record to AdminAuditLog table with "before" and "after" state
        pass
```

### 3.2 Device Un-link Logic (Integrated Login)
To resolve the authentication catch-22, we use a **Confirm-on-Login** flow:

1.  **Detection**: User attempts login on a new device with correct credentials.
2.  **Challenge**: If a different device is already bound and the 365-day cooldown has passed, the API returns:
    `{"error": "DEVICE_LOCKED", "can_reset": true, "last_reset_date": "2024-02-20"}`.
3.  **Confirmation**: The app prompts the user: "Thiết bị này khác với thiết bị đã đăng ký. Bạn có muốn đổi sang thiết bị này? (Tiếp theo bạn sẽ phải đợi 1 năm mới có thể đổi lại)".
4.  **Execution**: User retries login with additional body field `reset_device: true`.
5.  **Validation**: System verifies credentials + cooldown. If valid:
    - Sets `is_device_locked = False`.
    - Deactivates previous `UserDevice` records.
    - Creates new `UserDevice` as primary.
    - Updates `last_device_reset = now()`.
    - Issues JWT tokens.

---

## 4. Admin Interface (Jazzmin)
- **Dashboard**: Quick view of today's new users, total active VIPs, and today's Revenue (Redeemed Vouchers).
- **Audit View**: Filterable list of `AdminAuditLog` entries.
- **Device View**: Ability for staff to manually revoke a device binding in emergency cases (subject to audit logging).

---

## 5. API Endpoints (Detail)

| Endpoint | Method | Auth Required | Logic |
| :--- | :--- | :--- | :--- |
| `/api/auth/register/` | POST | No | Create user + auto-bind device. |
| `/api/auth/login/` | POST | No | Phone/Pass + Device check. Returns `DEVICE_LOCKED` if mismatch. |
| `/api/auth/login/` | POST | No | Login with `reset_device=true` to switch primary device (subject to 1yr cooldown). |
| `/api/users/me/device-status/` | GET | Yes | Show currently bound device and reset history. |

---
*Last updated: 2026-02-20*
