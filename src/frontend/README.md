# Thiên Thư – Web Frontend

Vue 3 (Composition API, `<script setup>`), Vite, Vue Router, Pinia, Axios. Design and flows follow [frontend-detail-design.md](../../md/design/frontend-detail-design.md).

## Setup

```bash
cd src/frontend
npm install
cp .env.example .env   # optional: set VITE_API_BASE_URL if needed
npm run dev
```

Dev server runs at `http://localhost:5173`. API requests to `/api/*` are proxied to `http://127.0.0.1:8000` (start the Django backend there).

## Scripts

- `npm run dev` – development server
- `npm run build` – production build
- `npm run preview` – preview production build

## Structure

- `src/api/` – Axios client, auth interceptor, refresh handling
- `src/components/auth/` – AppLogo, FormInput, PrimaryButton, PolicyBox, AuthLink, DeviceLockModal
- `src/components/app/` – AppHeader, BottomNav
- `src/composables/` – useDeviceId (fingerprint for device_id)
- `src/layouts/` – AuthLayout, AppLayout
- `src/router/` – routes, auth/guest guards
- `src/stores/auth.js` – Pinia auth store (tokens, user)
- `src/style/` – design tokens (variables.css), base.css
- `src/views/` – Login, Register, Home, Profile, Books, Store, Community

## Auth

- **Login** `/auth/login`: phone_number, password, device_id (WEB).
- **Register** `/auth/register`: phone_number, password, first_name, last_name, device_id, device_type WEB.
- On success, tokens and user are stored; redirect to Home. Device-lock response shows confirmation modal and retry with `reset_device: true`.
