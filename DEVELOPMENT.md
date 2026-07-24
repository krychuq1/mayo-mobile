# mayo-mobile — Development Notes

Mobile app (Android + iOS, one codebase) for the Mayo product, talking to the
existing **mayo-ba** backend. Built with **React Native + Expo (SDK 56) + TypeScript**.

---

## 1. Why this stack

| Decision | Choice | Reason |
| --- | --- | --- |
| Cross-platform framework | **React Native + Expo** | One codebase for Android + iOS; TypeScript (same language as the web app / backend types); largest ecosystem + best AI-assist coverage; Expo EAS can build iOS in the cloud **without a Mac**. |
| Backend | **Reuse mayo-ba as-is** | It's already a token-based (JWT `Bearer`) REST API — exactly what a mobile client wants. One backend, multiple clients (web + mobile) is standard practice. **No backend changes were needed for login.** |
| Token storage | **expo-secure-store** | Encrypted native storage (Keychain / Keystore) — the mobile equivalent of the web app's auth cookie. |

Alternatives considered: **Flutter** (great, but Dart can't share types with our TS
backend and has less AI training data) and **Capacitor** (would wrap the Angular
web app, but we wanted a fresh native app).

---

## 2. What was built

```
src/
  lib/
    env.ts            # resolves the mayo-ba base URL (auto-detects PC IP in dev)
    api.ts            # typed fetch client + /auth endpoints (mirrors mayo-ba)
    auth-context.tsx  # AuthProvider: token in secure-store + auth status machine
  app/                # expo-router file-based routes
    _layout.tsx       # wraps app in AuthProvider + Stack navigator
    index.tsx         # entry gate → redirects based on auth status
    login.tsx         # enter email → POST /auth (sends magic link)
    check-email.tsx   # polls check-token-status until the link is clicked
    home.tsx          # signed-in screen: full-screen vinted-items feed (snap scroll,
                      # one item per screen, pull-to-refresh, sign out in the top bar)
  components/
    vinted-item-card.tsx  # one feed card (photo carousel, title, size, prices, vinted
                          # link); "dodaj sosu" spins the card 4.5× (mayo-fe calendar
                          # animation) into a full-card sauce-photo carousel w/ back arrow
```

### Auth flow (passwordless / magic link)

Matches the mayo-ba `/auth` controller exactly — **no deep links needed for MVP**:

1. **Login** — user enters email → `POST /auth { email }`. Backend creates/finds the
   user, emails a magic link, and **returns the JWT immediately**
   (`{ token, isTokenActivated: false }`). The token is saved to secure storage.
2. **Check email** — app shows "check your email" and **polls
   `GET /auth/check-token-status`** (with `Authorization: Bearer <token>`) every 3s.
3. **Activation** — user clicks the email link, which activates the token
   server-side (`isTokenActivated → true`). The next poll returns `true`.
   In **dev** the link points at the local backend's own landing page
   (`GET /activate-user/:token` on mayo-ba's root controller, added 2026-07-03),
   because the prod web app (mayo-app.com) uses a different DB and cannot activate
   locally-issued tokens. mayo-ba dev `.env`: `CLIENT_URL=http://<pc-lan-ip>:3003/`
   (restore `https://mayo-app.com/` before deploying).
4. **Signed in** — app calls `GET /auth/validate-token` to load the user and routes
   to `home`. On every relaunch it bootstraps from the stored token.

`refreshActivation()` also fires when the app returns to the foreground, so clicking
the link and switching back to the app signs you in instantly.

### Backend endpoints used

| Endpoint | Purpose |
| --- | --- |
| `POST /auth` | Register/login; emails magic link; returns JWT |
| `GET /auth/check-token-status` | Has the magic link been clicked yet? (poll) |
| `GET /auth/validate-token` | Load the current user for a valid token |

All authenticated calls send `Authorization: Bearer <token>`.

---

## 3. How to run & test (no physical device required)

You need the **backend running** and an **Android emulator** (or a physical phone).

### Step 0 — Start the backend (mayo-ba)

Run mayo-ba so it listens on port **3003** on your PC (3000 is taken by
digibate-ba on this machine). NestJS binds to all interfaces by default, so the
emulator/phone can reach it.

### Option A — Android emulator on your PC (recommended, no phone needed)

1. Install **Android Studio** (https://developer.android.com/studio).
2. In Android Studio: **More Actions → Virtual Device Manager → Create Device**.
   Pick e.g. *Pixel 7*, choose a recent system image (API 34/35), finish, and
   **start the emulator** (▶).
3. From `E:\mayo-mobile`:
   ```bash
   npm run android
   ```
   Expo builds the dev client and installs it into the running emulator. First run
   takes a few minutes; later runs are fast.

> **Networking note:** `src/lib/env.ts` auto-detects the PC address Expo is serving
> from (`Constants.expoConfig.hostUri`) and targets `http://<that-ip>:3003`. This
> works for the emulator because the emulator can reach your PC's LAN IP. If you
> ever hardcode a host instead, the emulator's alias for "the host PC's localhost"
> is **`10.0.2.2`** (not `localhost`, which means the emulator itself).

### Option B — Physical Android phone (via Expo Go)

1. Install **Expo Go** from the Play Store.
2. From `E:\mayo-mobile`: `npm start`, then scan the QR code with Expo Go.
3. Requirements:
   - Phone and PC on the **same Wi-Fi**.
   - **Windows Firewall must allow inbound TCP 3003** (so the phone can reach the
     backend) and the Expo port. If the app can't reach the API, this is usually why.

### What to verify

- Enter an email → "check your email" screen appears.
- Click the magic link from that email (on any device).
- The app auto-advances to the home screen showing your email.
- Kill and reopen the app → it stays signed in.
- Sign out → returns to the login screen.

### Why not `npm run web`?

`expo-secure-store` has no web implementation, so the auth flow won't work in a
browser. Use the emulator or a phone.

---

## 4. Vinted items & the admin dashboard (added 2026-07-23)

Products (clothes from Vinted) are managed in **mayo-dashboard** (`E:\mayo-dashboard`,
Angular 16, `npm start` → http://localhost:4200, log in with the admin login + password
from mayo-ba's `.env` `ADMIN_LOGIN`/`ADMIN_PASSWORD` — the old raw `ADMIN_KEY` header is
gone as of 2026-07-24):

- `/` — **mayo-app items**: general Vinted items (no calendar day) that the mobile app
  should display.
- `/vinted-calendar` — the 24-day advent-calendar admin (one card per day).

Backend support (mayo-ba `/vinted-item`): `VintedItem.dayId` is now optional —
`null` means "general mayo-app item". The mobile app can fetch them **without auth**:

| Endpoint | Purpose |
| --- | --- |
| `GET /vinted-item/general` | General items for mayo-app (newest first) |
| `GET /vinted-item/day/:day` | Items behind advent-calendar day *n* |

Item shape: `title, size, description?, price, priceWithShipping, sauce, link,
vintedItemUrls[], sauceUrls[], isSold, dayId`.

**Adding items is semi-automatic:** paste a Vinted listing link into the dashboard form
and hit "pobierz dane" — the backend (`POST /vinted-item/scrape`, admin-only) scrapes the
listing (title, description, size, prices incl. shipping, all photos, sold status) and
prefills the form; only the sauce fields are manual. Vinted has no public API and its bot
protection blocks curl-like clients, but a plain Node fetch with anonymous homepage
cookies passes — no Vinted account/credentials involved.

**Sauce photo uploads (added 2026-07-23):** the sauce-images field has an upload button
("wgraj zdjęcia sosu z dysku 📷") — files go to `POST /media/upload` (mayo-ba `src/media/`,
admin-only, multipart field `images`, max 5× JPG/PNG, 20 MB each), which stores them in the
S3 bucket `media.mayo-app.com` (eu-north-1) and returns public URLs that get appended to
the sauce-URLs textarea. Env: `AWS_S3_MEDIA_BUCKET` (+ optional `MEDIA_PUBLIC_BASE_URL`
once DNS points media.mayo-app.com at the bucket); reference IAM/bucket policies in
`E:\mayo-ba\aws\`.

---

## 5. Open TODOs / next steps

- [ ] **Production API URL** — set `EXPO_PUBLIC_BACKEND_URL`, or replace
  `PROD_BACKEND_URL` in `src/lib/env.ts`, when the API is deployed.
- [ ] **git** — repo exists but the login feature + design port are uncommitted
  (mayo-ba's activation-page change is uncommitted too).
- [ ] **Deep linking (Phase 2)** — make the email link open the app directly
  (iOS Universal Links / Android App Links) and call `activate-user/:token`,
  instead of relying on polling. Optional; polling already works.
- [ ] **First real screen** — port the advent calendar
  (`UserWithCalendarData` / `open-day`) to prove end-to-end data flow.
- [ ] **Vinted items screen** — list general items from `GET /vinted-item/general`
  (added 2026-07-23; managed in mayo-dashboard).
- [ ] **iOS** — build via Expo EAS cloud build (needs an Apple Developer account,
  $99/yr, to install on devices / publish — but no Mac required to build).
