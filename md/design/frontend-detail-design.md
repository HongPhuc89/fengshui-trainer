# Frontend Detailed Design: Vue.js Web App (Phase 2)

## Document Information
- **Scope**: Phase 2 – Vue.js Web App (TASKS.md Features 8–12)
- **Reference**: TASKS.md Phase 2, feature-1-detail-design.md (Auth API), design screens (Login, Registration, Home Trang Chủ)
- **Last Updated**: 2026-02-21

---

## 1. Design System (Thiên Thư)

Design system derived from the Login and Scholar Registration screens. Use consistently across all auth and app UI.

### 1.1 Color Palette

| Token | HEX | Usage |
| :--- | :--- | :--- |
| **Background (page)** | `#2E1A0F` (login) / `#E0E0E0` (light page with dot pattern) | Main screen background. Login uses dark; registration card sits on light. |
| **Card / Container** | `#2E1A0F` – `#4A2C27` (dark reddish-brown) | Main content card (e.g. login container, registration card). |
| **Input background** | `#381E19` (darker brown) | Input fields inside cards. |
| **Primary text** | `#FFFFFF` / `#F0F0F0` | Headings, labels, body text. |
| **Accent / Links** | `#C5A551` (gold) / `#FDBF00` (golden-yellow) | Title “THIÊN THƯ”, taglines, “Forgot Password?”, “Register for Access”, “Terms of Service”, “Log In”. |
| **Primary action (button)** | `#C13123` – `#D20000` (red / deep red) | “ENTER LIBRARY”, “CREATE ACCOUNT”. |
| **Policy / notice box** | Dark red/maroon (e.g. `#8B2E2E` or semi-transparent red) | One Device Policy box, security notices. |
| **Border (inputs)** | Light grey, subtle | Thin border on input fields. |
| **App header title** | Red (e.g. `#C13123`) | “THIÊN THƯ” in app shell header. |
| **Badge: Premium** | Gold on black | Book/course “PREMIUM” label. |
| **Badge: Miễn phí** | Green text on green bg | “MIỄN PHÍ” (Free). |
| **Badge: VIP** | Red text on red bg | “VIP”. |
| **Progress bar fill** | Gold | Rank progress, chapter progress. |

### 1.2 Typography

| Element | Style | Notes |
| :--- | :--- | :--- |
| **App title** | Large, bold, sans-serif, uppercase | “THIÊN THƯ” – golden. |
| **Section / Subtitle** | Uppercase, smaller, regular sans-serif | “ANCIENT WISDOM ARCHIVES”, “SCHOLAR REGISTRATION”, “Access the Archives”. |
| **Tagline** | Italic, accent color | “Secure your access to ancient wisdom.” |
| **Labels** | Small, white/light grey | Above inputs: “Username / Phone”, “Password”, “Full Name”, etc. |
| **Body / Policy** | Small, white/light grey | Policy text, “New Scholar?”, “Already a scholar?”. |
| **Buttons** | Bold, uppercase, white | “ENTER LIBRARY”, “CREATE ACCOUNT”. |

### 1.3 Icons

Use a single icon set (e.g. Material Icons, Heroicons, or custom SVG) for consistency:

| Context | Icon | Description |
| :--- | :--- | :--- |
| **Logo** | Open book (gold, in circle) | Header logo. |
| **Username / Full Name** | Person outline | Left inside input. |
| **Phone** | Phone outline | Left inside input. |
| **Email** | Envelope | Left inside input. |
| **Password** | Lock (padlock) | Left inside input. |
| **Confirm Password** | Checkmark-in-shield | Left inside input. |
| **Password visibility** | Eye / Eye-slash | Right inside password fields; toggle show/hide. |
| **Primary button** | Right arrow (white) | Right of “ENTER LIBRARY” / “CREATE ACCOUNT”. |
| **One Device Policy** | Shield with cross (red) | Left of policy message. |
| **Security notice** | Padlock (small, white) | “END-TO-END ENCRYPTED”. |
| **App shell** | Hamburger (left), Bell (right), red dot on bell if unread | Top bar. |
| **Bottom nav** | Home, Library (book), Store (cart), Community (people), Profile (person) | Active tab in gold. |
| **Section** | Book icon (e.g. “Tiếp Tục Học”), play (triangle) | Section headers and CTAs. |
| **Level / achievement** | Compass or achievement symbol | Next to “Cấp 4”. |
| **Currency** | Diamond (gold) | “SỐ DƯ LINH THẠCH”. |
| **Lock (content)** | Small golden lock | Premium/locked book corner. |

### 1.4 Spacing & Layout

- **Container**: Rounded rectangle; max-width for large screens, full width on small. Centered.
- **Inputs**: Rounded corners, padding for text + left/right icons. Full width within card.
- **Buttons**: Large, full width, rounded corners.
- **Policy box**: Rounded corners, padding; icon left, text right.
- **App layout**: Top bar (fixed), scrollable content, fixed bottom nav (mobile-first). Cards: dark rounded rectangle with golden accents.

---

## 2. Feature 9.1 – Auth Pages (Detail)

### 2.1 Login Screen (“Thiên Thư Login Screen”)

**Route**: e.g. `/login`. **Reference**: Design screen 1.

#### 2.1.1 Structure (top to bottom)

1. **Header / Logo**
   - Golden circular outline with open-book icon (gold) inside.
   - Title: **THIÊN THƯ** (large, bold, gold, uppercase).
   - Subtitle: **ANCIENT WISDOM ARCHIVES** (smaller, white/light grey, uppercase).

2. **Section heading**  
   - “Access the Archives” (medium, white/light grey, bold).

3. **Form**
   - **Username / Phone**
     - Label: “Username / Phone” (above).
     - Input: person icon (left), placeholder “Enter your scholar ID”.  
     - Backend: accepts phone or username; map to same field (e.g. `username` or `phone_number` per API).
   - **Password**
     - Label: “Password” (above).
     - Input: lock icon (left), placeholder “Enter your secure key”, type `password` by default.
     - Right: eye/eye-slash to toggle visibility.
   - **Forgot Password?**  
     - Link (gold), right-aligned below password field → navigate to forgot-password flow (if implemented) or show message.

4. **Primary action**
   - Button: “ENTER LIBRARY” (red background, white bold text, right-arrow icon on right).
   - On submit: POST `/api/auth/login/` with `username`/`phone_number`, `password`, `device_id` (from device fingerprinting service).

5. **One Device Policy**
   - Box: dark red/maroon background, rounded, shield-with-cross icon (red) left.
   - Text: “One Device Policy: For security, your account can only be active on one device at a time. Logging in here will disconnect other sessions.”
   - “One Device Policy” may be slightly emphasized (bold or accent).

6. **Registration**
   - Text: “New Scholar?” (white/light grey).
   - Link: “Register for Access” (gold) → `/register`.

#### 2.1.2 Behaviour & API

- **Submit**: POST `/api/auth/login/`  
  Body: `{ "username" or "phone_number", "password", "device_id" }`.  
  On success: store tokens (e.g. Pinia auth store + secure storage), redirect to home or intended route.
- **Device locked**: If API returns `DEVICE_LOCKED` with `can_reset: true`, show confirmation modal (see feature-1-detail-design.md): “Thiết bị này khác với thiết bị đã đăng ký. Bạn có muốn đổi sang thiết bị này? (Tiếp theo bạn sẽ phải đợi 1 năm mới có thể đổi lại).” On confirm, retry with `reset_device: true`.
- **Validation**: Client-side non-empty username and password; display API error messages (invalid credentials, rate limit, etc.) near form or in toast.

---

### 2.2 Registration Screen (“Scholar Registration”)

**Route**: e.g. `/register`. **Reference**: Design screen 2.

#### 2.2.1 Structure (top to bottom)

1. **Header**
   - Logo: circular golden outline, dark gold fill, white stylized open book / person reading.
   - Title: **Thiên Thư** (large, bold, white).
   - Subtitle: **SCHOLAR REGISTRATION** (uppercase, white, smaller).
   - Tagline: *“Secure your access to ancient wisdom.”* (italic, golden-yellow).

2. **Form**
   - **Full Name**  
     Label “Full Name”. Input: person icon (left), placeholder “Nguyen Van A”.
   - **Phone Number**  
     Label “Phone Number”. Input: phone icon (left), placeholder “+84...”.
   - **Email Address**  
     Label “Email Address”. Input: envelope icon (left), placeholder “scholar@thienthu.vn”.
   - **Password**  
     Label “Password”. Input: padlock (left), type password, eye toggle (right).
   - **Confirm Password**  
     Label “Confirm Password”. Input: checkmark-in-shield (left), type password, eye-slash (right).

3. **Terms**
   - Checkbox (unchecked by default).
   - Text: “I agree to the Terms of Service and Copyright Protection Policy.”
   - “Terms of Service” and “Copyright Protection Policy.” as gold links (open in new tab or modal).

4. **Primary action**
   - Button: “CREATE ACCOUNT” (red, bold, white, right-arrow icon right).
   - Disabled until terms checked and all required fields valid.

5. **Security**
   - Small padlock icon + “END-TO-END ENCRYPTED” (white, small).

6. **Login**
   - “Already a scholar? Log In” (white); “Log In” gold link → `/login`.

#### 2.2.2 Behaviour & API

- **Submit**: POST `/api/auth/register/`  
  Body: `full_name`, `phone_number`, `email`, `password`, `device_id` (and any other required fields per API).  
  On success: store tokens, redirect (e.g. home).
- **Validation**:
  - Required: full name, phone, email, password, confirm password.
  - Password strength rules (min length, etc.) per backend; confirm password must match.
  - Phone format (e.g. E.164 or national format).
  - Email format.
- **Terms**: Submit disabled until checkbox checked; link to Terms and Copyright Policy pages.
- **Errors**: Show field-level or summary errors from API (e.g. phone/email already exists).

---

### 2.3 Shared Auth Components (Recommendations)

| Component | Description |
| :--- | :--- |
| **AppLogo** | Book icon + “THIÊN THƯ” + optional subtitle; props for variant (login vs register). |
| **FormInput** | Label, input with left icon, optional right slot (e.g. eye toggle). Support type, placeholder, model, error. |
| **PrimaryButton** | Red CTA with optional right icon (arrow); loading state. |
| **PolicyBox** | Dark red box with left icon + message (One Device Policy). |
| **AuthLink** | Gold link + optional prefix text (“New Scholar?”, “Already a scholar?”). |

### 2.4 Device Limit & Error Handling

- **DEVICE_LOCKED** (with `can_reset`): Show confirmation modal; on confirm retry login with `reset_device: true`.
- **DEVICE_LOCKED** (cooldown not passed): Show message that device cannot be changed until after `last_reset_date` + 365 days; offer “Log out” or contact support.
- **401 / Invalid credentials**: Show “Invalid username or password” (or message from API).
- **Network / 5xx**: Generic error message + retry.

---

### 2.5 Post-Login Redirect

- On successful login (or register), redirect to **Home (Trang Chủ)** at route e.g. `/` or `/home`.
- Use intended redirect if user opened a deep link while unauthenticated (save `redirect` query, then navigate after login).

---

## 3. Home Screen (Trang Chủ) – Post-Login

**Route**: `/` or `/home`. **Protected**: requires auth. **Reference**: Design – mobile home/dashboard.

Landing screen after login: dark theme, personalized greeting, profile/progress card, “Continue Learning”, “New Books”, and bottom navigation.

### 3.1 Top Navigation Bar

| Position | Content | Behaviour |
| :--- | :--- | :--- |
| **Left** | Hamburger icon (three horizontal lines) | Opens side menu (drawer). |
| **Center** | App logo: **THIÊN THƯ** (red, prominent), subtitle “MINH TRIẾT CỔ ĐIỂN” (smaller, white) | Tap → scroll to top or home. |
| **Right** | Bell icon | Notifications. Show small red dot if unread (from API or local state). |

### 3.2 Greeting and Motto

- **Line 1**: Time-based greeting + display name, e.g. “Chào buổi tối, Học giả Minh.” (Good evening, Scholar Minh.) — use `GET /api/users/me/` for name; compute “buổi sáng / trưa / tối” from local time.
- **Line 2**: Motto in bold white, e.g. “Tinh tú hội tụ, thời khắc học tập.” (Stars gather, time to learn.)

### 3.3 User Profile and Progress Card

Single dark rounded card with golden accents.

| Area | Content |
| :--- | :--- |
| **Left** | Circular avatar (user image or default “Scholar” figure). Below: “Học Giả” (Scholar) in white; “Cấp 4” (Level 4) with small level/achievement icon. |
| **Right** | “SỐ DƯ LINH THẠCH” (Spirit Stone Balance); golden diamond icon + value “1,250” (from `GET /api/wallet/me/`). |
| **Bottom** | “Tiến độ cấp bậc” (Rank Progress); horizontal progress bar (gold fill); label “650/1000 XP” (or from backend if XP/level API exists). |

- Avatar/level/XP can be from user profile or a dedicated progress API; balance from wallet API.

### 3.4 Continue Learning Section (“Tiếp Tục Học”)

- **Header**: “Tiếp Tục Học” (Continue Learning) in white + small book icon.
- **Card**: Dark rounded card.
  - **Left**: Book cover image (partial), e.g. “FENG SHUI” on spine; small book icon overlay bottom-left.
  - **Right**: “CHƯƠNG 4” (Chapter 4); “Phong Thủy Cơ Bản” (book/course title); “Bát Quái Đồ & Dòng Ch...” (chapter title, truncated). Golden circular play button (triangle) on the right → navigate to book chapter or video lesson.
  - **Progress**: Horizontal bar ~75% filled (gold); “75%” at end. Data from reading/video progress API if available.
- If no “continue” item: show placeholder “Bắt đầu học” (Start learning) or hide section.

### 3.5 New Books Section (“Sách Mới”)

- **Header**: “Sách Mới” (New Books) in white. Right: “Xem Tất Cả” (View All) in gold → link to books list (e.g. `/books`).
- **Content**: Horizontal scrolling list of book cards.
  - **Card**: Cover image; top-left label badge: “PREMIUM” (gold on black), “MIỄN PHÍ” (green on green), or “VIP” (red on red). Premium/locked: small golden lock icon bottom-right on cover.
  - Tap card → book detail (e.g. `/books/{slug}`).
- Data: `GET /api/books/` with sort/filter for “new” or latest; map `is_free`, VIP, paid to badge.

### 3.6 Bottom Navigation Bar

Fixed bar, five items; active tab in gold.

| Label | Icon | Route / Action |
| :--- | :--- | :--- |
| **Trang Chủ** | House | `/` or `/home` (current). |
| **Thư Viện** | Book | `/library` or `/books`. |
| **Cửa Hàng** | Shopping cart | `/store` (wallet, vouchers, shop). |
| **Cộng Đồng** | People/group | `/community` (if implemented). |
| **Hồ Sơ** | Person | `/profile`. |

### 3.7 Behaviour & API

- **Data**: User from auth store or `GET /api/users/me/`; balance from `GET /api/wallet/me/`; continue-learning from progress/books API (e.g. last read chapter or last watched lesson); new books from `GET /api/books/` (filter new/recent).
- **Responsive**: Layout is mobile-first; on desktop the same structure can be used with wider cards and optional sidebar instead of bottom nav if needed.

---

## 4. Feature 9.2 – Profile & Settings (Outline)

- **Profile page**: Display user info (name, phone, email), VIP status, subscription end (if any). Reuse design system (card, typography, accent for VIP).
- **Edit profile**: Form for editable fields; same input/button components as auth.
- **Device management**: List bound device(s) and “next reset date”; read-only unless backend exposes “request reset” or similar. Use GET `/api/users/me/device-status/`.
- **VIP banner**: Prominent accent (gold) for VIP users in header or profile.

---

## 5. Feature 8 – Vue.js Project Setup (Outline)

- **Stack**: Vite, Vue 3, Pinia, Vue Router, Axios. UI: adopt design system (custom CSS/SCSS or component library with theme overrides).
- **Layout**: Auth layout (centered card, no sidebar) vs app layout (sidebar/header for books, videos, practice).
- **API client**: Base URL from env; Axios interceptor to attach JWT and handle 401 (redirect to login / refresh).
- **Device fingerprinting**: Service (e.g. fingerprintjs or custom) to get `device_id` for register/login and device-status.
- **Auth store (Pinia)**: `user`, `accessToken`, `refreshToken`; actions login, register, logout, refresh; persist tokens (e.g. memory + optional secure storage).

---

## 6. Feature 10 – Books Module Web (Outline)

- **List**: Grid/list of books; filters (category, free/paid); card shows cover, title, price/“Free”/“VIP”. Same dark theme + gold accents.
- **Detail**: Cover, title, author, description, table of contents, “Buy with Linh Thạch” or “Read” (VIP/purchased). Link to reader.
- **Reader**: Full-screen reading; HTML content; watermark overlay (composable from Feature 8); chapter nav (prev/next); CSS to discourage screenshot (e.g. user-select, overlay).
- **Purchase flow**: Confirm modal → POST purchase API → success message / balance update.

---

## 7. Feature 11 – Videos Module Web (Outline)

- **List & detail**: Same visual language; video cards with thumbnail, title, progress; detail page with lessons list, purchase/play.
- **Player**: Video.js (or similar); overlay watermark; progress POST on pause/seek/leave; transcript/summary tabs; quiz section if API provides it.

---

## 8. Feature 12 – Practice Module Web (Outline)

- **Modules / Chapters**: List with unlock status (locked vs unlocked).
- **Flashcards**: Card flip animation; input for review quality; sync progress.
- **Tests**: Multiple choice / true-false; submit answers; show results.
- **Case study**: Content viewer; same design system.

---

## 9. Task Checklist Mapping (TASKS.md)

| TASKS.md Item | This doc section |
| :--- | :--- |
| 8.1 Project init, router | §5 |
| 8.2 API client, auth interceptor, device fingerprinting, watermark | §5 |
| 9.1 Login page | §2.1 |
| 9.1 Registration page | §2.2 |
| 9.1 Post-login redirect, Home screen | §2.5, §3 |
| 9.1 Device limit error handling | §2.4 |
| 9.1 Auth store (Pinia) | §5 |
| 9.2 Profile, Edit profile, Device management, VIP banner | §4 |
| 10.x Books list, detail, reader, purchase | §6 |
| 11.x Videos list, detail, player | §7 |
| 12.x Practice UI | §8 |

---

*Last updated: 2026-02-21*
