# PWA — Progressive Web App

**Ngày đề xuất:** 2026-03-26
**Nguồn cảm hứng:** Twitter PWA, Duolingo web (installable), Google Maps PWA
**Độ ưu tiên gợi ý:** 🟡 Medium
**Effort ước tính:** S

---

## Vấn đề / Cơ hội

Thiên Thư chưa có Flutter mobile app (Phase 3). Trong khi đó, phần lớn người dùng Việt Nam học trên điện thoại. PWA là **bridge** giữa web app hiện tại và trải nghiệm app-like trên mobile browser — không cần publish lên App Store/Google Play.

Designer-summary.md đã đề cập: "Cân nhắc thiết kế UI/UX theo hướng app-like trên trình duyệt mobile để khuyến khích người dùng 'Add to Home Screen'". Vue.js + Vite hỗ trợ PWA qua plugin `vite-plugin-pwa` — implementation rất nhanh.

**Lợi ích cụ thể:**
- "Add to Home Screen" → app icon trên màn hình điện thoại → tăng daily opens
- Offline access cho content đã cache (Service Worker)
- Push notifications về sau (cần HTTPS + FCM — đã có plan)
- Faster subsequent loads (precached assets)
- Fullscreen mode (no browser UI) → trải nghiệm học tốt hơn

## Ý tưởng tính năng

**Phase 1 — Installable PWA (S effort):**
- `manifest.json`: tên "Thiên Thư", icon, theme color (gold `#c9a227`), display: standalone
- `vite-plugin-pwa`: service worker tự động generate, precache assets
- HTTPS đã có (production requirement)
- Banner "Thêm vào màn hình chính" — prompt sau 2 lần visit
- iOS Safari: meta tags `apple-mobile-web-app-capable`, splash screen

**Phase 2 — Offline reading (M effort):**
- Service Worker cache: book content đã đọc gần đây (JSON), thumbnails
- "Offline indicator" khi mất mạng
- PDF: chỉ cache chapter đang đọc (không cache toàn bộ PDF)

**Phase 3 — Background sync (L effort, sau khi có Celery/push):**
- Push notifications khi có content mới (link với Feature 6 Notifications)
- Background sync reading progress khi có kết nối lại

## Tại sao phù hợp với Thiên Thư

Trước khi có Flutter mobile app, PWA là cách **nhanh nhất và rẻ nhất** để có presence trên home screen người dùng. Với Thiên Thư đang nhắm tới market Việt Nam — người dùng quen với "install app" nhưng không muốn tốn dung lượng — PWA là compromise hoàn hảo. Gold theme color + custom icon + fullscreen sẽ tạo ra trải nghiệm premium khác biệt với chỉ bookmark trình duyệt.

## Inspiration từ market

- **Twitter/X PWA**: Tốc độ tải và install flow — reference PWA case study
- **Duolingo web**: Installable, offline lesson progress sync, push notifications
- **Starbucks PWA**: Lightweight app-like experience, works offline

## Scope gợi ý cho V1 (Installable only — S effort)

- [ ] `npm install vite-plugin-pwa` trong `src/frontend/`
- [ ] Cấu hình `vite.config.js`: thêm VitePWA plugin, manifest config
- [ ] `public/icons/`: icon sizes 192x192 và 512x512 (thiết kế logo Thiên Thư)
- [ ] Meta tags trong `index.html`: apple-mobile-web-app, theme-color
- [ ] Test trên Chrome mobile: Lighthouse PWA score, "Add to Home Screen" flow
- [ ] Test trên iOS Safari: splash screen, standalone mode

**`vite.config.js` additions:**
```javascript
import { VitePWA } from 'vite-plugin-pwa'

VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: 'Thiên Thư',
    short_name: 'Thiên Thư',
    theme_color: '#c9a227',
    background_color: '#1a1a2e',
    display: 'standalone',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ]
  }
})
```

## Open questions

- Offline mode cần thiết cho V1? Gợi ý: không — chỉ installable là đủ V1, offline là V2
- App icon: cần design mới hay dùng logo hiện tại? Logo phải 512×512 PNG, nền solid (không transparent cho some Android)
- Service Worker strategy: `NetworkFirst` hay `CacheFirst` cho API calls? Gợi ý: API = NetworkFirst, static assets = CacheFirst

## Bước tiếp theo

- [ ] Chuyển sang PO review → `/project-owner-detail-design-review`
- [ ] Viết detail design → `md/design/feature-N-pwa.md`
- [ ] Thiết kế icon 192×512 trước khi implement (blocker)
