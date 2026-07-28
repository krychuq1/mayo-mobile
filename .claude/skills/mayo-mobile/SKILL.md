---
name: mayo-mobile
description: Project knowledge base for the Mayo mobile app (Expo/React Native) — architecture, auth flow, mayo-ba backend contract, sibling repo paths, and how to run/test on emulator and physical Android phone. Use whenever working in E:\mayo-mobile, touching auth, calling the backend, or setting up dev/testing. Keep this file updated whenever anything here changes.
---

# mayo-mobile — Project Knowledge Base

> **Living document.** Whenever you add a feature, change the auth flow, add an
> endpoint, or learn something new about dev/testing setup, UPDATE THIS FILE in
> the same change. Also keep `E:\mayo-mobile\DEVELOPMENT.md` in sync (that's the
> human-facing doc; this skill is the agent-facing one).

## Repos (all local on this PC)

| Repo | Path | What it is |
| --- | --- | --- |
| mayo-mobile | `E:\mayo-mobile` | This app. React Native + **Expo SDK 56** + TypeScript, expo-router. |
| mayo-ba | `E:\mayo-ba` | NestJS + Prisma backend. **Source of truth for the API.** Port is env-driven since 2026-07-24: `PORT` in `.env` — local dev = **3003** (3000 taken by digibate-ba on this PC), prod = default 3000 behind nginx. Auth: `src/auth/auth.controller.ts`. GitHub: krychuq1/mayo-ba (branches: develop = active work, prod = deployed, master = default/registers workflows). |
| mayo-fe | `E:\mayo-fe` | Old Angular web app — reference implementation. Auth logic: `src/app/services/auth.service.ts`, guard in `auth.guard.ts`. |
| mayo-dashboard | `E:\mayo-dashboard` | Angular 16 admin panel (NgModule, SCSS, port 4200). Routes: `/` = mayo-app items admin, `/vinted-calendar` = advent-calendar admin. See its own section below. |

Key docs: `E:\mayo-mobile\DEVELOPMENT.md` (full dev notes), `E:\mayo-mobile\CLAUDE.md` → `AGENTS.md`
(says: read the Expo v56 docs at https://docs.expo.dev/versions/v56.0.0/ before writing code).

## App structure

```
src/
  lib/
    env.ts            # BACKEND_URL: dev = http://<metro-host-ip>:3003 (auto-detected
                      #   from Constants.expoConfig.hostUri); prod = EXPO_PUBLIC_BACKEND_URL
    api.ts            # typed fetch client + authApi (mirrors mayo-ba /auth)
    auth-context.tsx  # AuthProvider — token in expo-secure-store, status machine:
                      #   loading | signedOut | pendingActivation | signedIn;
                      #   also hasAccess (trial started? loaded WITH the user, so
                      #   signedIn ⇒ hasAccess is a boolean) + refreshAccess()
  components/
    screen.tsx        # brand gradient + SafeArea wrapper (wrap every screen)
    mayo-logo.tsx     # orange wordmark image
  app/                # expo-router file routes
    _layout.tsx       # Inter font loading (splash held until ready) + AuthProvider + Stack
    index.tsx         # entry gate → redirect by auth status
    login.tsx         # welcome-screen port: logo/sosik/clothes + email form (Polish)
    check-email.tsx   # polls activation every 3s + on app foreground; on signedIn
                      #   routes to '/' so the index gate decides feed vs paywall
    paywall.tsx       # 7-day-trial paywall (Claude Design templates/paywall/): white
                      #   card w/ "7 DNI ZA 0 ZŁ" badge, 45,00 zł/mies., "zaczynamy!"
                      #   → POST /checkout/subscription → Linking.openURL(stripe url);
                      #   polls refreshAccess every 3s + on foreground → /home when
                      #   trial recorded; "nie teraz, dzięki" = signOut. Verified
                      #   end-to-end in emulator 2026-07-26 (real Stripe test payment).
    home.tsx          # vinted-items feed: full-screen snap cards (FlatList pagingEnabled,
                      #   card height = list viewport via onLayout), pull-to-refresh,
                      #   top bar = logo (28px) + ProfileMenu; FILTRUJ row opens FilterSheet;
                      #   client-side filtering: price range (priceWithShipping, bounds
                      #   floor/ceil from loaded items, null = off) + tag multi-select (OR);
                      #   empty-filter state "nic nie pasuje do filtrów 😢" + wyczyść;
                      #   data: vintedApi.getGeneral()
  components/
    profile-menu.tsx  # "mój profil" pill + dropdown (Claude Design template): dane/płatność
                      #   = Alert "wkrótce 👀" placeholders, wyloguj się (red + logout.svg).
                      #   No outside-tap dismiss (toggle only). topBar needs zIndex 30.
    filter-sheet.tsx  # full-screen filter Modal (design template): ZAKRES CEN dual slider +
                      #   TAGI dark/white toggle pills + WYCZYŚĆ (bg-deep) / ZOBACZ (dark)
                      #   square buttons. NO statusBarTranslucent (header collided w/ status bar).
    range-slider.tsx  # custom dual-thumb PanResponder slider (2px dark track, 14px SQUARE
                      #   thumbs per design); live values via ref so responders stay fresh.
                      #   New icons in assets/images: chevron-up/down (blue), filter-sliders,
                      #   close-x (dark), logout (red) — static SVGs, rendered by expo-image.
    vinted-item-card.tsx  # feed slide implementing the Claude Design "Product detail"
                          #   template (Mayo Design System project, templates/product-detail/):
                          #   white card w/ swipeable photo carousel (orange position dots,
                          #   hidden for 1 photo) + meta + CTAs. Primary CTA "dodaj sosu"
                          #   (sold → disabled "sprzedane 👀") flips the WHOLE card
                          #   (reanimated two-face flip, physics ported from mayo-fe
                          #   calendar-day.scss: 1620° = 4.5 spins, 2.5s,
                          #   Easing.bezier(0.1,0.9,0.2,1), backfaceVisibility hidden,
                          #   perspective 1000) to a full-card sauceUrls carousel
                          #   (🥫 placeholder if empty) with a back-arrow chip
                          #   (assets/images/arrow-back.svg, copied from mayo-fe) that
                          #   spins it back. Verified in emulator 2026-07-23.
                          #   "zobacz na vinted" = underlined blue text link (per design).
                          #   Description (2026-07-26, per design template): clamped to
                          #   2 lines; "więcej ⌄" / "mniej ⌃" toggle (chevron-up/down
                          #   svgs, 13px semibold heading-blue) shown only when the text
                          #   overflows (hidden unclamped Text copy + onTextLayout counts
                          #   lines). Expanded = photo/tags/title/meta HIDDEN, full desc
                          #   in a ScrollView takes over the card (design's sc-if
                          #   descCollapsed pattern; needs nestedScrollEnabled — the
                          #   feed is a vertical paging FlatList, Android won't scroll
                          #   a nested vertical ScrollView without it). Size text truncates
                          #   (numberOfLines=1 + flexShrink) so the price stays on-screen.
```

Path alias: `@/*` → `src/*`. Typecheck with `npx tsc --noEmit`.

## Design system (ported from mayo-fe — keep in sync)

Source of truth on web: `E:\mayo-fe\src\app\styles\{colors,input,buttons,fonts}.scss`.
Mobile port: `src/lib/theme.ts` (tokens + input/button style objects) — always style
screens from there, never hardcode colors.
Claude Design: project "Mayo Design System" (claude.ai/design/p/c14e0093-8658-4dd3-8d8a-691e93501c64)
holds the tokens + brand vocabulary (synced 2026-07-23, tokens-only — see `.design-sync/NOTES.md`;
local bundle in `ds-bundle/`). Designs made there can be read back via DesignSync `get_file`
(e.g. `templates/product-detail/ProductDetail.dc.html` → implemented in vinted-item-card.tsx).

- Colors: primary orange `#F77710`, heading blue `#063DBF`, text `#1E1E1E`,
  background `#FFF7E3`, gradient `#FFF7E3 → #FFECBC` (web: 349deg), error `#900B09`,
  input border `#D9D9D9` (focus `#A8A8A8`), placeholder `#B3B3B3`.
- Font: **Inter** (`@expo-google-fonts/inter`, loaded in `_layout.tsx`:
  400 Regular / 600 SemiBold / 700 Bold). Web also has "Press Start 2P" (pixel accent
  font, `#9B7556`) — not ported yet.
- Buttons: orange pill (radius 28, padding 16, text `#FAFAFA`), disabled = opacity 0.7.
- Inputs: white bg, radius 8, padding 16 (mirrors web `.mayo-input`).
- Components: `src/components/screen.tsx` (brand gradient + SafeArea wrapper — wrap every
  screen in it), `src/components/mayo-logo.tsx` (orange wordmark).
- Brand assets in `assets/images/` (all copied from `E:\mayo-fe\public\`): `mayo-logo.svg`
  (orange wordmark), `blue-logo-sign.svg`, `sosik.png` (1111x232, "każdy fit potrzebuje sosu"
  banner), `clothes.png` (780x377 collage), `magic-link.svg` (white button icon).
  Rendered with **expo-image** (SVG works natively, no react-native-svg).
- Splash background: `#FFF7E3` (app.json). App icons are still the Expo defaults — TODO.

## Language: POLISH ONLY

The product is for a Polish audience — **all user-facing copy must be Polish**
(playful, lowercase, brand voice like the web app; "magic link" stays English).
Reuse web copy where it exists. Current copy: login = welcome screen port
(¡hola! / "jaaak miło, że tu jesteś 😌…", button "Wyślij magic link do logowania",
errors "Email jest wymagany." / "Podaj poprawny adres email."), check-email =
"Sprawdź swoją skrzynkę 📬", home = "Zalogowano jako" / "Wyloguj się".
Login validates on submit (button always enabled) like the web form, not by disabling the button.

## Auth flow (passwordless magic link — matches mayo-ba exactly)

1. `POST /auth { email }` → creates/finds user, emails a magic link, returns
   `{ token, isTokenActivated: false }` **immediately**. Token saved to secure store.
2. App shows check-email screen, polls `GET /auth/check-token-status` (Bearer token) every 3s.
3. User clicks the email link → the landing page activates the token server-side.
4. Next poll returns `true` → app calls `GET /auth/validate-token` to load the user → home.
5. On relaunch, AuthProvider bootstraps from the stored token (same check-status → validate path).

**Magic-link target (important):** the email links to `CLIENT_URL + 'activate-user/' + token`
(mayo-ba `src/mail/mail.service.ts`). Activation must hit the SAME backend/DB that issued the
token — the local backend has its own DB (`localhost:15434`), so in dev the prod web app
(mayo-app.com) can NOT activate local tokens. Solution (added 2026-07-03, mayo-ba):
public `GET /activate-user/:token` on the ROOT controller (`src/app.controller.ts`) renders a
branded Polish HTML page and activates via `authService.activateUserByToken(token)` (JWT
verified from the URL, no Authorization header needed — `src/auth/auth.service.ts`).
Dev `.env` sets `CLIENT_URL=http://<pc-lan-ip>:3003/` so the phone's browser lands there.
**PROD (since 2026-07-24): `CLIENT_URL=https://server.mayo-app.com/`** — the API's own
activation page, NOT https://mayo-app.com/: mayo-fe's `activate-user/:token` route is
COMMENTED OUT in app.routes.ts, so links to the web app silently do nothing (this bit us
on the first phone prod test — email link opened mayo-app.com, token never activated,
app polled forever). SendGrid wraps links in ct.sendgrid.net click-tracking — normal,
it redirects through. If the PC's LAN IP changes, update dev CLIENT_URL and restart.

Other mayo-ba endpoints available (for future features): `GET /auth/check-open-all-days`,
`PUT /auth/open-day/:dayId` (advent calendar), `GET /videos`, `POST /videos/resend`,
`/checkout`, `/vinted-item`. All user-authed calls use `Authorization: Bearer <token>`.

## Vinted items (mayo-ba `/vinted-item` — updated 2026-07-23)

`VintedItem.dayId` is now **optional** (Prisma migration `20260723115208_vinted_item_optional_day`):
`dayId` 1-24 = advent-calendar item (FK → global `Day.dayNumber`), `dayId: null` = **general
item to be shown in mayo-app** outside the calendar. Fields: title, size, description?,
price, priceWithShipping, sauce? (optional since migration `vinted_item_optional_sauce`),
link, vintedItemUrls[] (non-empty), sauceUrls[] (optional/empty ok), isSold,
tags[] (enum `VintedItemTag` = tag1…tag5 — placeholder names to be renamed later; zero or
many per item; migration `20260724100956_vinted_item_tags`; default `[]`). ⚠️ The
`VintedItemController` has a SCOPED `ValidationPipe({ whitelist: true })` (added 2026-07-24)
— there is NO global pipe on purpose: other controllers (e.g. `RegisterModel` on `/auth`)
have undecorated DTOs that class-validator 0.14 would reject wholesale. Bad tags → 400 with
a Polish-free class-validator message; before the pipe they surfaced as a misleading 404.
Dashboard form has toggleable tag pills; dashboard card shows tag chips.
Tag chip design (Claude Design product-detail template, implemented 2026-07-24 in mobile
`vinted-item-card.tsx` — chips between photo and title — and in the dashboard): per-tag
colors — tag1 orange bg/white text, tag2 blue bg/white, tag3 `--mayo-bg-deep` #FFECBC
bg/dark text, tag4 `--mayo-text` #1E1E1E bg/white, tag5 white bg/dark text + `--mayo-border`
#D9D9D9 border; all 12px semibold, padding 4px 12px, radius 999. Dashboard: global
`.tag-chip` + `.tag-chip--tagN` classes in `styles.scss` (kept GLOBAL on purpose —
component-scoped styles would beat them on specificity via Angular's `_ngcontent`
attribute); card uses them directly, form pills wear their tag color always with
opacity 0.35 when unselected / 1 when selected. Mobile: `TAG_CHIP` map in
vinted-item-card.tsx; `VintedItemTag` type in `src/lib/api.ts`.

| Route | Auth | Purpose |
| --- | --- | --- |
| `GET /vinted-item/general` | public | General items (`dayId: null`, newest first) — **mobile app should render these** |
| `GET /vinted-item/day/:day` | public | Items for a calendar day |
| `POST /vinted-item` | admin | Create (omit/null `dayId` for a general item) |
| `PUT /vinted-item/:id`, `DELETE /vinted-item/:id` | admin | Update / delete |
| `POST /vinted-item/scrape` `{url}` | admin | Scrape a Vinted listing URL → prefill data (title, description, size, price, priceWithShipping = price+shipping, photos, isSold, brand) |

### Vinted scraping (works as of 2026-07-23 — `src/vinted-item/vinted-scraper.service.ts`)

Vinted has **no public API** and DataDome bot protection that blocks by TLS fingerprint:
curl/PowerShell get **403 even on the homepage**, but **Node's TLS stack passes** (plain
`fetch`, no extra deps). Sharing Vinted login credentials would NOT help (blocked pre-auth)
and isn't needed. Flow: GET `vinted.pl` homepage → anonymous session cookies (incl.
`access_token_web` JWT) → GET the item page with those cookies → parse three sources:
ld+json `Product` (title/description/price/brand/availability), Next.js RSC flight chunks
`self.__next_f.push([1,"..."])` (first `"photos":[{...}]` array = gallery `full_size_url`s;
`"shippingDetails"` → shipping price), and server-rendered DOM
(`data-testid="item-attributes-size"` → bold span = size; size is NOWHERE in the JSON).
Dead endpoints (all 404 now, don't retry): `/api/v2/items/:id`,
`/web/api/core/items/:id/details` (used by the old `E:\vinted-test3` experiment with a
hardcoded now-expired Bearer). Still alive: `/api/v2/catalog/items?per_page=N` with
`Authorization: Bearer <access_token_web>`. Prior experiments: `E:\vinted-test` (Python
vinted-api-wrapper), `E:\vinted-test2\Vinted-Scraper` (cloudscraper, worked), `E:\vinted-test3`
(NestJS, the approach mayo-ba now uses properly with fresh-cookie fetch per request).

"admin" = `AuthAdminGuard` (reworked 2026-07-24): `Authorization: Bearer <admin JWT>` with
an `isAdmin: true` claim, obtained from `POST /auth/admin/login { login, password }`
(checked against mayo-ba `.env` `ADMIN_LOGIN`/`ADMIN_PASSWORD`, timing-safe; token signed
with `JWT_SECRET`, expires 30d; 401 = "Nieprawidłowy login lub hasło."). The old raw
`ADMIN_KEY` header is REJECTED now — `.env` still has `ADMIN_KEY` but nothing reads it
(safe to delete). ⚠️ prod `.env` needs `ADMIN_LOGIN`/`ADMIN_PASSWORD` before deploying.
Per-user calendar open-state (`AdventCalendar`) is separate and
only linked to items by the shared day number.

## Media uploads (mayo-ba `/media` — added 2026-07-23, verified end-to-end)

`POST /media/upload` (admin) — multipart field **`images`**, max **5 files**, JPG/PNG only,
**20 MB** each → uploads to S3 bucket **`media.mayo-app.com`** (region from `AWS_REGION`,
eu-north-1), returns `{ urls: string[] }`. Code: `src/media/` (module/controller/service).
Keys: `uploads/<yyyy-mm-dd>/<uuid>.<ext>`, `CacheControl: immutable`. URLs are **path-style**
(`https://s3.eu-north-1.amazonaws.com/media.mayo-app.com/<key>`) because the dotted bucket
name breaks TLS on virtual-hosted URLs; set `.env` `MEDIA_PUBLIC_BASE_URL` once DNS/CloudFront
points `media.mayo-app.com` at the bucket. Env: `AWS_S3_MEDIA_BUCKET=media.mayo-app.com`
(note: `AWS_S3_BUCKET_NAME=mayo-masterclasses` is a DIFFERENT, older bucket — videos).
The existing AWS key already had Put/Delete rights and the bucket already serves public reads
(verified 2026-07-23); reference policies live in `E:\mayo-ba\aws\`
(`iam-policy-media-upload.json`, `bucket-policy-public-read.json`). Errors are Polish;
multer returns 413 "File too large" / 400 "Unexpected field" (>5 files) itself.
Dashboard: sauce-images field in `vinted-item-form` has an upload button ("wgraj zdjęcia sosu
z dysku 📷") → `services/media.service.ts` → appends returned URLs into the `sauceUrls`
textarea; client-side validates type/count/size first with Polish messages.

## Paywall / app subscription (added 2026-07-26, verified end-to-end)

Signed-in users who never started the **7-day free trial** are gated off the feed
onto `app/paywall.tsx` (see app-structure notes). Trial state = a `Purchase` row
with `productId: 'app-subscription'` (constant `APP_SUBSCRIPTION_PRODUCT_ID` in
mayo-ba `src/checkout/checkout.service.ts`). Flow:

1. Gate: `index.tsx` routes signedIn → `hasAccess ? /home : /paywall`; `home.tsx`
   also bounces `hasAccess === false` → paywall. `hasAccess` is fetched in
   auth-context together with validate-token (`GET /checkout/subscription-status`).
2. CTA "zaczynamy!" → `POST /checkout/subscription` (Bearer) → mayo-ba creates/reuses
   the Stripe customer (`User.stripeCustomerId`, created with the user's email) and
   a Checkout session: `mode: subscription`, `subscription_data.trial_period_days: 7`,
   price `.env STRIPE_SUBSCRIPTION_PRICE_ID` (test: price_1TxVBALnLWCvutZzixy1PZDM,
   45 zł/mies., product prod_UxQ1CiL20Fii8y "Mayo — subskrypcja aplikacji"),
   `success_url = CLIENT_URL + 'trial-success'` (branded Polish page on the root
   controller, like activate-user). App opens the URL via `Linking.openURL`.
3. Webhook `POST /checkout-webhook` (`checkout.session.completed`): sessions with
   `mode === 'subscription'` upsert the user + create the app-subscription Purchase
   + Slack paymentCompleted, then RETURN EARLY — the masterclass email flow below
   only runs for one-time `payment` sessions. Dev webhook delivery = user runs
   `stripe listen --forward-to localhost:3003/checkout-webhook` (secret in `.env`
   matches the listener).
4. Paywall polls `GET /checkout/subscription-status` every 3s + on app foreground →
   flips to the feed when the webhook lands. "nie teraz, dzięki" = signOut.

Testing: Stripe test card `4242 4242 4242 4242` (any future expiry/CVC). Reset a
user to "no trial" (in E:\mayo-ba):
`echo "DELETE FROM \"Purchase\" WHERE \"userEmail\" = '<email>' AND \"productId\" = 'app-subscription';" | npx prisma db execute --schema prisma --stdin`
A signed webhook can be forged for tests with `stripe.webhooks.generateTestHeaderString`
+ the `.env` secret (see 2026-07-26 session). The OLD `GET /checkout` masterclass
flow (mode payment, anonymous customer) is untouched. ⚠️ krys.nagorny@gmail.com has
a test purchase + trialing test-mode subscription in the LOCAL dev DB (from the
verification run). ⚠️ **Prod TODO:** create the live-mode 45 zł/mies. recurring
price and set `STRIPE_SUBSCRIPTION_PRICE_ID` in the server `.env` (root-owned,
sudo tee) — without it `POST /checkout/subscription` 500s on prod.

### RevenueCat / store billing (added 2026-07-27, code done, dashboards pending)

Store releases must use native IAP, so the paywall CTA prefers **RevenueCat**
(`react-native-purchases`, installed) and falls back to the Stripe browser flow.

- `src/lib/purchases.ts`: `nativeBillingAvailable()` = env key set AND not Expo
  Go (`Constants.appOwnership === 'expo'`); lazy `import()` of the SDK so Expo
  Go never touches the native module. Keys: `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`
  / `EXPO_PUBLIC_REVENUECAT_IOS_KEY` (public SDK keys — NOT yet set; user is
  creating the RevenueCat project). `identifyPurchaser(email)` configures with
  `appUserID = email` (called from auth-context on both sign-in paths);
  `purchaseSubscription()` buys the current offering's first package, returns
  'cancelled' on `userCancelled`.
- mayo-ba `src/revenuecat-webhook/` (module in app.module): `POST
  /revenuecat-webhook`, auth = exact `Authorization` header match vs `.env`
  `REVENUECAT_WEBHOOK_AUTH` (dev value ends `...290250`; set the SAME string in
  RevenueCat → Integrations → Webhooks; ⚠️ prod server `.env` too, sudo tee).
  INITIAL_PURCHASE/RENEWAL/UNCANCELLATION → idempotent `app-subscription`
  Purchase row (`stripeCustomerId: 'revenuecat'`) + Slack; EXPIRATION →
  deleteMany of exactly those rows (revokes access — Stripe-billed rows are
  untouched); non-email app_user_id (RC anonymous) → warn + 200. Verified
  locally 2026-07-27: 401/grant/dup-noop/revoke/anon-ignore; test user cleaned.
- Still needed before a store purchase can work: RevenueCat project + Android
  API key in env, Play Console app (package com.mayoapp.mobile) with the
  `mayo_monthly` 45 zł subscription + 7-day-trial offer, Play↔RevenueCat
  service-account credentials, signed AAB on internal testing (dev build —
  Expo Go can't run the SDK), webhook URL pointed at the prod server.

## mayo-dashboard (admin panel — redesigned 2026-07-23)

Angular 16 NgModule app, `npm start` → http://localhost:4200. Auth (reworked 2026-07-24):
login modal (`components/login-modal`, Polish copy, login + hasło) → `AdminAuthService`
(`services/admin-auth.service.ts`) POSTs `/auth/admin/login`, stores the admin JWT in
localStorage (`mayo-dashboard-admin-token`; the legacy `mayo-dashboard-api-key` entry is
auto-removed); `interceptors/auth.interceptor.ts` attaches `Authorization: Bearer <token>`
to everything except the login call, and on any 401 clears the token so the modal reappears.
"wyloguj" button in the topbar. Creds = mayo-ba `.env` `ADMIN_LOGIN`/`ADMIN_PASSWORD`.

- Routes (`src/app/app-routing.module.ts`): `/` → `MayoAppComponent` (CRUD for **general**
  items via `/vinted-item/general`), `/vinted-calendar` → `VintedCalendarComponent`
  (24-day grid, CRUD per day). Shared components: `vinted-item-form` (emits the payload
  minus `dayId`; the page adds `dayId: day` or `null`) and `vinted-item-card`.
- `vinted-item-card` (reworked 2026-07-26): equal-height cards (`:host` + `.item`
  height 100%, grid cells stretch) with a collapsed/expanded state. Photo area = fixed
  4:3 scroll-snap CAROUSEL of all vintedItemUrls, ported from the mobile PhotoCarousel
  look: overlay dots bottom 10px centered gap 6, 6×6 rgba(255,255,255,.6) dots, active
  = 14px `--mayo-orange` pill, dots hidden for 1 photo; active index tracked via
  (scroll) → round(scrollLeft/clientWidth). Mouse support (scroll-snap alone is
  touch/trackpad-only): overlay prev/next arrow chips (32px white circles, styled after
  the mobile back-chip, hidden at the ends) + clickable dots, both calling
  `scrollToPhoto` → `el.scrollTo({left: i*clientWidth, behavior:'smooth'})`. Tag chips + vinted/sauce links are ALWAYS
  visible; the chevron (inline SVG, rotates 180° when open) sits DIRECTLY UNDER the
  description and toggles ONLY the description between 2-line clamp
  (`-webkit-line-clamp`) and full text. It renders only when the clamped text actually
  overflows: `ngAfterViewChecked` measures `scrollHeight > clientHeight` on `#descEl`
  (guarded compare + `cdr.detectChanges()` to avoid the changed-after-checked error;
  skipped while expanded so the button stays for collapsing; empty
  `@HostListener('window:resize')` forces a CD pass to re-measure on resize).
- The form has an **import bar**: paste a Vinted listing link → "pobierz dane" → calls
  `POST /vinted-item/scrape` and prefills everything except the sauce fields.
- Design: mayo design system as CSS variables in `src/styles.scss` (`--mayo-orange` etc. —
  same tokens as mobile `theme.ts`), Inter via Google Fonts in `index.html`, brand gradient
  body, pill `.btn`, `.mayo-input`, `.card`. Logos copied to `src/assets/images/`.
  UI copy is Polish (lowercase brand voice).
- Environments: `environment.development.ts` = `http://127.0.0.1:3003` (127.0.0.1, NOT
  localhost — IPv6 trap; NOT 3000 = digibate-ba), `environment.ts` (prod) =
  `https://server.mayo-app.com`.
- Deploy (WORKING since 2026-07-24): push to branch `prod` of
  github.com/krychuq1/mayo-dashboard → GitHub Action (`.github/workflows/deploy.yml`) →
  `ng build` production → S3 sync to `dashboard.mayo-app.com` (eu-north-1) with mayo-fe's
  cache split + CloudFront invalidation. Secrets AWS_ACCESS_KEY_ID/_SECRET set by the
  user; merged deploy IAM policy in `aws/iam-policy-deploy.json` (invalidation scoped to
  the distribution), checklist in `DEPLOY.md`. FULLY LIVE: **https://dashboard.mayo-app.com**
  via CloudFront **E14YWT0WTBKNTL** (repo var `CLOUDFRONT_DISTRIBUTION_ID` set via API;
  invalidation step verified green). S3 website hosting has index+error doc = index.html,
  so SPA deep links RENDER fine but carry HTTP **404 status** (S3 error-doc semantics;
  harmless for an admin panel — a CloudFront custom error response 404→/index.html→200
  would clean it up).
  Git auth quirk on this PC: pushes as krychuq1 work only via GCM store — extract with
  `git-credential-manager.exe get` (username=krychuq1) and pass as a basic-auth
  http.extraheader; plain `git push` prompts and dies (no tty), and `gh` is logged in as
  digibate (wrong account for mayo repos). mayo-fe's own deploy workflow is the reference:
  buckets mayo-app.com / dev.mayo-app.com, CF E3IF3SWCTDUXV8 / EPR5MWB54Y62B. The mayo-ba
  `.env` AWS key (IAM user `mayo-app`, acct 767397855093) has no rights on this bucket.
- Removed 2026-07-23: old single-view `components/dashboard`, broken `day.service.ts`
  (imported nonexistent `api.config`), stray NestJS guard in `src/auth/`.

## mayo-ba prod deploy (WORKING since 2026-07-24)

Push to `prod` of krychuq1/mayo-ba → `.github/workflows/deploy.yml` (also
workflow_dispatch). **Build happens ON THE CI RUNNER** (npm ci + prisma generate + nest
build → tar dist), then scp + raw ssh to EC2: git checkout -f -B prod, `npm ci
--omit=dev` (prisma is a runtime dep now so the CLI survives prod-only installs),
prisma generate + migrate deploy, swap dist, `pm2 restart main --update-env || pm2
start dist/src/main.js --name main`, pm2 save, local health check. NEVER build on the
box — the original 1 GB instance thrashed into a full prod outage doing npm ci while
serving (SSH unreachable, needed reboot).

- Server (since 2026-07-24 resize): **ec2-51-21-219-231.eu-north-1.compute.amazonaws.com**,
  ubuntu, 2 GB/2 vCPU, app at `~/mayo-ba` (pm2 process `main` → dist/src/main.js, port
  3000, nginx in front, DB = RDS `database-1.cz2ck28c2d38.eu-north-1.rds.amazonaws.com`).
  Keys in `C:\Users\krysn\OneDrive\Pulpit\mayo\`: `mayo.pem` (OpenSSH, works) and
  `mayo.ppk` (PuTTY/plink). GH Actions uses a dedicated deploy key (secret
  SSH_PRIVATE_KEY on mayo-ba; 2nd line of server authorized_keys). node/pm2 via nvm —
  ALWAYS `source ~/.nvm/nvm.sh` in non-interactive ssh. `.env` is root-owned (sudo tee to
  edit; passwordless sudo ok) and has ADMIN_LOGIN/ADMIN_PASSWORD (verified live: admin
  JWT flow works on prod, old ADMIN_KEY header rejected). pm2 does NOT resurrect on boot.
- ⚠️ The OLD instance still answers at 13.63.158.99 (nginx 502, dead app) and
  **server.mayo-app.com DNS still points at it** — user must repoint the A record to
  51.21.219.231 (Elastic IP recommended) and then kill the old box.
- GitHub quirk: workflows only REGISTER once the file exists on the default branch
  (master) — a prod-only workflow file never triggers; that cost one silent no-run.

## Running & testing

**Always start the backend first:** in `E:\mayo-ba` run `npm run start:dev` (port **3003**,
binds all interfaces; needs its `.env` — Prisma DB, SendGrid for the actual emails).
Port 3000 is taken by digibate-ba (IPv6 `::`) on this PC — that's why mayo-ba moved to 3003.
`http://localhost:3000` in a browser hits digibate-ba (Windows prefers IPv6); use `127.0.0.1` to force IPv4.

- **Web (`npm run web`) does NOT work** for auth — expo-secure-store has no web implementation.
- **Android emulator (PC, no phone):** already set up on this PC (see Environment facts).
  Start the emulator, then `npm run android` in `E:\mayo-mobile`. Emulator reaches the PC's
  LAN IP automatically via env.ts host detection (fallback alias for host localhost: `10.0.2.2`).
  Start command:
  `$env:ANDROID_AVD_HOME='E:\android-avd'; & "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -avd Pixel_7 -no-metrics`
- **Physical Android phone (Expo Go):** ⚠️ the **Play Store Expo Go is SDK 54** and rejects
  this SDK 56 project ("project is incompatible") — sideload Expo Go SDK 56 instead: on the
  phone from https://expo.dev/go (pick SDK 56 → Android), or via USB
  `adb install "C:\Users\krysn\.expo\android-apk-cache\Expo-Go-56.0.4.apk"`. Play Store may
  auto-"update" it back to SDK 54 — disable auto-update for Expo Go. Then `npm start` in
  `E:\mayo-mobile` → scan QR or enter `exp://<pc-lan-ip>:8081` manually. Requirements:
  phone + PC on the **same Wi-Fi**, and Windows Firewall must allow inbound TCP **3003**
  (backend) and **8081** (Metro) — this PC's Wi-Fi profile is **Public**, so the explicit
  rules are required and MUST be added from an elevated PowerShell (as of 2026-07-03 they
  were still missing; `New-NetFirewallRule` fails with access-denied from a normal shell).
  Do NOT use `--tunnel`: it breaks env.ts backend-IP detection (API URL is derived from
  the Metro host).
- Firewall rules (run once, elevated PowerShell):
  `New-NetFirewallRule -DisplayName "mayo-ba 3003" -Direction Inbound -Protocol TCP -LocalPort 3003 -Action Allow`
  `New-NetFirewallRule -DisplayName "Expo Metro 8081" -Direction Inbound -Protocol TCP -LocalPort 8081 -Action Allow`

Manual test checklist: enter email → check-email screen → click magic link (any device) →
app auto-advances to home with the email shown → kill & reopen app stays signed in → sign out returns to login.

## Environment facts (this PC)

- Windows 11, Node v24.6.0, deps installed via npm.
- Android tooling (set up 2026-07-03, verified working — app ran in emulator):
  - Android Studio via winget; SDK at `%LOCALAPPDATA%\Android\Sdk` (installed headlessly
    via cmdline-tools: platform-tools, emulator, android-36 platform + google_apis x86_64 image).
  - AVD `Pixel_7` lives on `E:\android-avd` (**C: was too full for the 7.4 GB data partition**);
    `ANDROID_AVD_HOME=E:\android-avd` is set as a user env var — required or the emulator won't find it.
  - `ANDROID_HOME` + platform-tools/emulator on user PATH (new terminals only).
  - Java for sdkmanager/avdmanager: Android Studio's bundled JBR (`C:\Program Files\Android\Android Studio\jbr`).
- Port 3000 is occupied by digibate-ba (`E:\digibate-ba`) — mayo-ba uses 3003.
- mayo-mobile is a git repo (branch `master`, PRs target `main`).

## Where we left off (2026-07-23)

- ✅ Phone login loop confirmed working by the user ("all works") after the CLIENT_URL fix.
  Current PC LAN IP is **192.168.0.104** (mayo-ba `.env` CLIENT_URL updated from stale .107).
  The explicit 3003/8081 firewall rules still don't exist — generic `node.exe` Public allow
  rules are covering it.
- ✅ mayo-dashboard redesigned (see its section): routing added (`/` mayo-app admin,
  `/vinted-calendar` calendar admin), mayo design system, Polish copy, dead files removed.
  `ng build --configuration development` passes.
- ✅ mayo-ba: `VintedItem.dayId` made optional + `GET /vinted-item/general` added; migration
  applied to local DB; verified end-to-end via API (create general item → list → delete).
- ✅ Vinted URL import: `POST /vinted-item/scrape` + dashboard form import bar, verified
  against a live listing (all fields incl. size + 6 photos). See "Vinted scraping" section.
- ℹ️ Running the backend from dist: entry is `dist\src\main` (NOT `dist\main` — `npm run
  start:prod` is broken). If `npm run start:dev` (watch) is running, killing the node child
  just makes the watcher respawn it. `prisma generate` fails with EPERM while the backend
  runs (engine DLL locked) — stop it first.
- ✅ 2026-07-24: all three repos committed (mayo-mobile `master` 934745a, mayo-ba
  `develop` 53d875b, mayo-dashboard `master` 2cd7907 — one batch commit each; nothing
  pushed yet). mayo-mobile `.gitignore` now excludes `.idea/`.
- ✅ Mobile feed DONE: home.tsx is now a TikTok-style vertical snap feed of general vinted
  items (one full-screen card per item), verified in the emulator end-to-end (login →
  feed → snap scroll). Emulator test trick: type email in app, then flip the flag in DB —
  `echo "UPDATE \"User\" SET \"isTokenActivated\" = true WHERE email = '<email>';" |
  npx prisma db execute --schema prisma --stdin` (in E:\mayo-ba) — the app's 3s poll picks
  it up. ⚠️ PowerShell `Invoke-RestMethod` mangles emoji when POSTing JSON (encoding) —
  don't seed Polish/emoji content through it; a junk dev user `emutest.mayo@gmail.com`
  exists in the local DB.
- ✅ Sauce photo uploads DONE (see "Media uploads" section): mayo-ba `POST /media/upload` →
  S3 `media.mayo-app.com` + dashboard upload button on the sauce field. Verified live:
  upload 201 + public URL readable, gif/6-files/21MB/bad-key all rejected correctly.
- ✅ "dodaj sosu" sauce flip DONE (see vinted-item-card notes above): card spins 4.5×
  into a full-card sauce carousel with back arrow; verified in emulator end-to-end
  (open + close, real sauce image). Feed data is fetched once on mount — restart Expo Go
  (`adb shell am force-stop host.exp.exponent` + open `exp://<pc-ip>:8081`) to refetch.
- ✅ 2026-07-24: proper admin login replaced the raw ADMIN_KEY (see the "admin" paragraph
  and mayo-dashboard section). Verified live: wrong creds 401, real creds → token → admin
  create/delete OK, old ADMIN_KEY header rejected; dashboard dev build passes.
- ✅ 2026-07-24: vinted item tags added (enum tag1…tag5, multi-select pills in the
  dashboard form, chips on the dashboard card; see the vinted-items section). Verified
  live: create/update/clear tags OK, invalid tag → 400, dashboard dev build passes.
  NOT committed yet (mayo-ba + mayo-dashboard both have the tag changes pending).
- ✅ 2026-07-24 (later): tag chips styled per the updated Claude Design product-detail
  template in BOTH the mobile card and the dashboard (see tag-chip design notes above).
  Mobile typecheck + dashboard dev build pass; not yet eyeballed in the emulator.
- ✅ 2026-07-24 (later still): design template round 2 implemented in mobile — "mój profil"
  dropdown (replaces top-bar Wyloguj się), FILTRUJ + full-screen filter sheet (price range
  dual slider + tag pills), client-side feed filtering. Verified end-to-end in the emulator
  (login → feed → dropdown → filter tag2+max 71 → feed filtered correctly → wyczyść resets).
  Test item deleted after; emutest user left signed in in the emulator.
- ✅ 2026-07-24: all committed again (mayo-mobile 70649b1, mayo-ba 7f3de26, mayo-dashboard
  036edff; nothing pushed).
- ✅ 2026-07-26: **paywall DONE** (see "Paywall / app subscription" section): mayo-ba
  subscription checkout + webhook branch + /trial-success page + subscription-status
  endpoint; mobile paywall.tsx + hasAccess gate in auth-context/index/home. Verified
  end-to-end in the emulator with a real Stripe test payment (paywall → checkout →
  4242 card → trial-success → webhook → feed unlocked). NOT committed yet
  (mayo-ba + mayo-mobile changes pending).
- ✅ 2026-07-27: **RevenueCat code wired** (see "RevenueCat / store billing"):
  react-native-purchases installed, purchases.ts wrapper + identify-on-sign-in +
  paywall native/Stripe branching; mayo-ba /revenuecat-webhook verified locally.
  NOT committed. User created the Google Play Console account (org "Krys Nago",
  no app yet) and got instructions for: Play app creation + mayo_monthly sub,
  RevenueCat project setup, Apple Developer enrollment (started, takes days).
- ✅ 2026-07-28: **store setup + prod deploy done.** Play app "mayo" created
  (internal testing, v1 AAB uploaded by user); subscription `mayo_monthly` /
  base plan `monthly-base` (45 zł/mies., 7-day free-trial offer, new-customer
  eligibility) ACTIVE; RevenueCat project 69393ebf fully wired (Play service
  creds VALIDATED — product import worked same day; entitlement `access`;
  `default` offering → one Monthly package with mayo_monthly:monthly-base;
  webhook "production" → server.mayo-app.com/revenuecat-webhook, Both
  Prod+Sandbox, filtered to Play app). Android public SDK key
  `goog_WYneNIZpVXOtfMrltXXLwVAOtQC` in `E:\mayo-mobile\.env`
  (EXPO_PUBLIC_REVENUECAT_ANDROID_KEY, committable). App icons replaced
  (orange splat #F77710 on cream #FFF7E3 from blue-logo-sign.svg path, sharp
  script; adaptiveIcon bg #FFF7E3; ios.icon entry removed → falls back to
  icon.png). mayo-ba deployed to prod (develop=prod=1429cbe): webhook 401/200
  + trial-success verified live; REVENUECAT_WEBHOOK_AUTH added to server .env.
  **v2 AAB ready** (versionCode 2, upload-key signed, RC key embedded —
  verified inside bundle) at android\...\bundle\release\app-release.aab.
- ✅ 2026-07-28 (later): **REAL PURCHASE TEST PASSED** — user installed the v2
  AAB from internal testing, sandbox trial purchase → RC webhook → feed. 🎉
  Then app went **store-billing only** (user decision: no Stripe for mobile):
  paywall Stripe fallback REMOVED (Expo Go CTA now shows an info message;
  grant dev access via SQL INSERT of an app-subscription Purchase row —
  snippet in DEVELOPMENT.md), `checkoutApi.startTrial` removed (backend
  Stripe subscription endpoints still deployed but unused — prune later).
  NEW `app/platnosc.tsx` (profile → płatność): status badge (hasAccess) +
  45 zł + "zarządzaj subskrypcją" deep link to Play subscription manager
  (cancel there → RC EXPIRATION webhook revokes at period end); wired from
  profile-menu (dane still placeholder). ⚠️ typed-routes trap: new route
  needed manual add to `.expo/types/router.d.ts` for tsc (regenerates on
  `npm start`). tsc clean.
- ⏳ **Pick up here:** local dev = Expo Go + local backend as before (billing
  is the only thing needing store builds). mayo-mobile changes NOT committed
  yet (paywall + RC + icons + platnosc). Still open: dane placeholder, advent
  calendar screen, prune unused Stripe subscription code from mayo-ba, v2 AAB
  with platnosc screen not yet rebuilt/uploaded (current store build lacks
  it), iOS: Apple Developer enrollment in progress → RevenueCat iOS app +
  EXPO_PUBLIC_REVENUECAT_IOS_KEY + App Store Connect product later.

## Local Android release APK (first done 2026-07-24 — prod testing on a phone)

`env.ts` prod fallback is now the real `https://server.mayo-app.com` (EXPO_PUBLIC_BACKEND_URL
still overrides). app.json: name "Mayo", android.package `com.mayoapp.mobile`. Build:
`npx expo prebuild --platform android` then `android\gradlew.bat assembleRelease` with
`JAVA_HOME=C:\Program Files\Android\Android Studio\jbr`, `ANDROID_HOME=%LOCALAPPDATA%\
Android\Sdk`, **`GRADLE_USER_HOME=E:\gradle-cache`** (C: is 97% full). ~23 min first build,
output `android\app\build\outputs\apk\release\app-release.apk` (~100 MB, debug-signed —
fine for sideloading, NOT for Play Store). ⚠️ Known trap: RN 0.85's
`node_modules/@react-native/gradle-plugin/settings.gradle.kts` pins foojay-resolver 0.5.0
which CRASHES Gradle 9.3 ("JvmVendorSpec … IBM_SEMERU") — patch it to 1.0.0 after every
npm install (or add patch-package if this becomes routine). `android/` is gitignored.

### Play-signed AAB (added 2026-07-28)

Upload keystore: `E:\mayo-mobile\credentials\mayo-upload.keystore` (alias
`mayo-upload`; `credentials/` gitignored). Passwords + paths live as `MAYO_UPLOAD_*`
props in **`E:\gradle-cache\gradle.properties`** (GRADLE_USER_HOME). ⚠️ That file
must be BOM-FREE: PowerShell `Add-Content -Encoding utf8` wrote a UTF-8 BOM which
silently corrupted the first property key → Gradle fell back to DEBUG signing
(caught 2026-07-28 via `keytool -printcert -jarfile`; fixed by rewriting with
`UTF8Encoding($false)`). Signing block in `android/app/build.gradle`: signingConfigs
gets a conditional `release` config reading `MAYO_UPLOAD_*` via findProperty, and
buildTypes.release uses it when present (debug otherwise) — **re-add this block
after every `expo prebuild --clean`** (android/ is regenerated). Build:
`gradlew.bat bundleRelease` (same JAVA_HOME/ANDROID_HOME/GRADLE_USER_HOME as APK) →
`android\app\build\outputs\bundle\release\app-release.aab` (~77 MB, versionCode 1).
First AAB built 2026-07-28 to unlock Play subscription creation (Play requires an
uploaded build with com.android.vending.BILLING — react-native-purchases brings the
permission in via manifest merge; verified present in the merged manifest).
Distribution: upload APK to the public media bucket, e.g.
`aws s3 cp … s3://media.mayo-app.com/apk/mayo-prod-<date>.apk` (creds from mayo-ba .env)
→ https://s3.eu-north-1.amazonaws.com/media.mayo-app.com/apk/mayo-prod-2026-07-24.apk

## Open TODOs

- Deep linking (Phase 2): make the Gmail click OPEN THE APP directly. Requires a real build
  (EAS dev build APK — Expo Go cannot register Android App Links): intent filter for
  https://mayo-app.com/activate-user/* in app.json + `assetlinks.json` hosted on the domain +
  in-app route that calls activate. Polling already covers login UX meanwhile.
- First real screen: port the advent calendar (`UserWithCalendarData` / `open-day`).
- Fix mayo-ba `start:prod` script (`node dist/main` → `node dist/src/main`).
- iOS testing (researched 2026-07-23): ⚠️ **no free path on a physical iPhone right now.**
  App Store Expo Go is stuck at SDK 54 (Apple hasn't approved SDK 55/56, no timeline —
  expo.dev/changelog/expo-go-and-app-store-may-2026); iOS can't sideload; SDK 56 TestFlight
  external beta is full; iOS Simulator needs a Mac. Both real options need the Apple
  Developer Program ($99/yr, no Mac required): (a) quick: `npx eas-cli@latest go
  --sdk-version 56.0.0` in E:\mayo-mobile — builds a personal Expo Go 56 and delivers via
  own TestFlight, then the workflow matches Android (npm start + scan QR, same Wi-Fi +
  firewall rules); (b) proper: EAS development build (`eas build -p ios --profile
  development`) — needed later for deep linking anyway. Re-check the App Store version
  occasionally in case Apple approves a newer Expo Go. **Free with a Mac:** the iOS
  Simulator route needs no Apple account — Xcode + Expo Go SDK 56 simulator build from
  expo.dev/go (drag .app onto the simulator), then open `exp://<pc-lan-ip>:8081` in the
  simulator's Safari — Metro + backend keep running on this PC (same Wi-Fi + firewall
  rules). No Mac = no simulator (none exists for Windows).
