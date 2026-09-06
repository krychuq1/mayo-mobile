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
    paywall.tsx       # 7-day-trial paywall — Claude Design templates/paywall/Paywall.dc.html
                      #   (re-implemented 2026-09-06): top bar logo + ProfileMenu; card gap 20:
                      #   title 24px blue "Rozpocznij 7-dniowy okres próbny za 0 zł" + 3
                      #   benefit bullets (check-muted.svg 16px, 14px text; BENEFITS const)
                      #   with bottom border; "Aktualnie" + green "0,00 zł" badge + 13px muted
                      #   note; "Po okresie próbnym" / "45,00 zł / mies." 15px; orange pill
                      #   "Wypróbuj za 0 zł" (RevenueCat purchaseSubscription; Expo Go → info
                      #   error) + "Brak ukrytych opłat…" caption; BELOW the card underlined
                      #   "Nie teraz, dzięki" = signOut. Logic unchanged: polls refreshAccess
                      #   every 3s + on foreground → /home. Verified in emulator 2026-09-06
                      #   (DELETE emutest Purchase → paywall; INSERT → poll → feed).
    home.tsx          # vinted-items feed: full-screen snap cards (FlatList pagingEnabled,
                      #   card height = list viewport via onLayout), pull-to-refresh,
                      #   top bar = logo (28px) + ProfileMenu, padding 20/20/16 + "Filtruj" row
                      #   (15px semibold dark + filter-sliders.svg 22x18, gap 10, padding 8/20/12)
                      #   per app-header template (2026-09-06) opens FilterSheet;
                      #   client-side filtering: price range (priceWithShipping, bounds
                      #   floor/ceil from loaded items, null = off) + tag multi-select (OR);
                      #   empty-filter state "nic nie pasuje do filtrów 😢" + wyczyść;
                      #   data: vintedApi.getGeneral()
  components/
    profile-menu.tsx  # "Mój profil" BARE button + dropdown — Claude Design
                      #   templates/app-header/AppHeader.dc.html (implemented 2026-09-06):
                      #   user-dark.svg 16px + 15px semibold DARK label + chevron-{up,down}-dark
                      #   14px, gap 8 (no pill/border since 09-06; shared by home/dane/platnosc/
                      #   paywall). Menu 8px below: "Moje dane" / "Subskrypcja" / divider /
                      #   "Wyloguj" — all 14px REGULAR dark, no icon, no red (user mockup
                      #   2026-09-06; logout.svg now unused). No outside-tap dismiss (toggle
                      #   only). topBar needs zIndex 30.
    filter-sheet.tsx  # full-screen filter Modal (design template): ZAKRES CEN dual slider +
                      #   TAGI dark/white toggle pills + WYCZYŚĆ (bg-deep) / ZOBACZ (dark)
                      #   square buttons. Since 2026-09-06: Modal is statusBarTranslucent +
                      #   navigationBarTranslucent and pads inner top/bottom with
                      #   useSafeAreaInsets (real phones drew the Modal under the status bar
                      #   while the emulator inset it → X unreachable on the user's Samsung);
                      #   close X hitSlop 16.
    range-slider.tsx  # custom dual-thumb PanResponder slider (2px dark track, 14px SQUARE
                      #   thumbs per design); live values via ref so responders stay fresh.
                      #   New icons in assets/images: chevron-up/down (blue), filter-sliders,
                      #   close-x (dark), logout (red) — static SVGs, rendered by expo-image.
  app/dane.tsx        # "Moje dane" — Claude Design templates/personal-data/PersonalData.dc.html
                      #   (implemented 2026-09-06): top bar = logo + ProfileMenu (no back arrow,
                      #   hardware back works); white card at TOP (not centered): "Moje dane"
                      #   22px bold blue + Email row (muted label / semibold value, bottom
                      #   border) then "Dokumenty" links Polityka prywatności + Regulamin
                      #   (15px semibold + arrow-up-right.svg) → mayo-app.com/privacy-policy
                      #   and /terms-and-conditions (both live). Below the card: "Usuń konto"
                      #   underlined 13px regular w/ alert-octagon.svg 14px (red) + 13px muted
                      #   caption (shrunk from 16/18 on 2026-09-06, user request; caption says
                      #   "zakładka Subskrypcja"); confirm Alert → DELETE /auth/me → signOut. ProfileMenu uses
                      #   router.navigate (not push) so dane→dane doesn't stack a duplicate.
                      #   Sentence-case copy here on purpose (matches the design).
  app/platnosc.tsx    # "Subskrypcja" — Claude Design templates/my-subscription/
                      #   MySubscription.dc.html (implemented 2026-09-06): same top bar as
                      #   dane; card gap 18: title 24px blue + "Konto: <email>" (bottom
                      #   border); "Plan: Mayo Standard" + badge (Aktywna green #D9F2DF/
                      #   #1A7F37 radius 8; Nieaktywna grey; Anulowana = active but
                      #   willRenew=false, bg-deep/#9B7556); "Cena" **45,00 zł** / mies.;
                      #   "Kolejna płatność" (or "Dostęp do" when cancelled) bold Polish
                      #   date via `getSubscriptionInfo()` in purchases.ts (RC
                      #   getCustomerInfo → entitlement `access` expirationDate/willRenew;
                      #   null in Expo Go / unconfigured → row HIDDEN — only visible in a
                      #   store/dev build); orange pill "Zarządzaj subskrypcją" (12/24
                      #   padding per .btn) → Play subscription manager + muted caption.
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
                          #   Template round 3 (2026-09-06, current design): title 18px bold
                          #   DARK (was blue); meta row = bare size "XS / 34 / 6" 15px regular
                          #   (no "rozmiar") + BLUE price block "18,05 zł" bold 17 + "w tym"
                          #   15 + shield-check-blue.svg (= shipping included); description
                          #   15px/23; "więcej"/"mniej" toggle = dark underlined 15px regular
                          #   + chevron-{down,up}-dark.svg (still only when >2 lines — design
                          #   shows it always, kept the overflow check on purpose); CTA = DS
                          #   .btn 16px/12-24 "Dodaj sosu, żeby wystylizować" / sold
                          #   "Sprzedane"; "Zobacz na Vinted" = dark 15px regular + link-dark
                          #   .svg, NO underline. Verified collapsed + expanded in emulator.
                          #   Header "Mój profil" bare button + "Filtruj" DONE 2026-09-06 via
                          #   the app-header template (see profile-menu.tsx / home.tsx notes).
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
  Start the emulator, then (since 2026-09-06) **`npx expo start --go`** in `E:\mayo-mobile`
  and open `exp://<pc-lan-ip>:8081` in Expo Go (`adb shell am start -a
  android.intent.action.VIEW -d exp://<ip>:8081 host.exp.exponent`). ⚠️ `npm run android`
  now = `expo run:android` (a NATIVE gradle build, because `android/` exists from prebuild)
  and dies with "JAVA_HOME is not set" — not what you want for design iteration anyway.
  Don't prefix `CI=1` (disables Fast Refresh); pass `< /dev/null` for stdin instead.
  Emulator reaches the PC's LAN IP automatically via env.ts host detection (fallback alias
  for host localhost: `10.0.2.2`).
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
- ✅ 2026-08-04: mayo-mobile committed (952699e, versionCode 3); the on-disk
  AAB at android\...\bundle\release\app-release.aab IS the v3/platnosc build
  (verified: merged release manifest versionCode="3") — ready to upload, NOT
  yet uploaded to Play. server.mayo-app.com DNS verified repointed
  (51.21.219.231, HTTP 200) — old stale-DNS warning above is resolved.
- ✅ 2026-08-04: **privacy policy rewritten for the app** in mayo-fe
  (`src/app/master-classes/privacy-policy/privacy-policy.html`, live URL
  https://mayo-app.com/privacy-policy) — Polish, GDPR/Play-ready: admin
  contact pmror@mayo-app.com, data = email/subscription status/token/logs,
  legal bases, Google Play billing + RevenueCat + SendGrid + AWS as
  processors, non-EEA transfers (SCC), retention, rights + UODO, account
  deletion section (in-app "mój profil" or email), security, children <16,
  changes. `npm run build` passes. NOT yet committed/deployed (mayo-fe
  deploy = push branch `prod` → GH Action → S3 mayo-app.com + CloudFront).
- ✅ 2026-08-04 (later): **privacy policy DEPLOYED + account deletion DONE.**
  mayo-fe: policy committed (187494a) and pushed to BOTH main (prod deploy →
  mayo-app.com) and develop (dev deploy); mayo-fe deploy = push branch `main`
  (NOT a `prod` branch — main=prod bucket, develop=dev bucket per
  .github/workflows/deploy.yml); the route is Angular-PRERENDERED so the
  static HTML carries the content. Git-push trick that works: get password
  via `printf "protocol=https\nhost=github.com\nusername=krychuq1\n\n" |
  git-credential-manager.exe get` (in Git's mingw64/bin), then push with
  `-c http.extraheader="AUTHORIZATION: basic <b64(krychuq1:pw)>"`
  (`git credential fill` does NOT find it). Account deletion (see
  DEVELOPMENT.md §6 for full detail): mayo-ba `DELETE /auth/me` (Bearer) +
  public flow `GET /delete-account` (email form) → `POST
  /auth/request-deletion` → SendGrid inline-HTML mail with 1h JWT
  (purpose:'account-deletion' — login JWTs rejected) → GET confirm page →
  POST `/delete-account/:token/confirm` deletes (children first,
  transaction; NEVER deletes on GET — click-tracking prefetch). Play
  Data-safety deletion URL = https://server.mayo-app.com/delete-account.
  Mobile: `app/dane.tsx` (email + polityka-prywatności link + red usuń
  konto → confirm Alert → DELETE /auth/me → signOut), profile-menu dane
  wired, `/dane` added to .expo/types/router.d.ts, `authApi.deleteAccount`
  + DELETE method in api.ts. Backend verified end-to-end locally (form
  200 / confirm page / wrong-purpose rejected / delete + orphan check /
  unknown-email ok / DELETE /auth/me 200→401); `nest build` + mobile tsc
  clean. Dane screen VERIFIED in emulator (feed → mój profil → dane →
  confirm Alert renders → cancel; polityka-prywatności link opens Chrome
  at mayo-app.com/privacy-policy). NOT committed (mayo-ba, mayo-mobile);
  request-deletion EMAIL path untested (sends real SendGrid mail). Needs
  v4 build+upload before Play submission. ⚠️ PC LAN IP changed .104 →
  **192.168.0.102** (dev CLIENT_URL in mayo-ba .env updated 2026-08-04).
  ⚠️ Emulator is signed in as krys.nagorny@gmail.com (NOT emutest) — the
  emutest row got a dev-grant app-subscription Purchase in local DB.
- ✅ 2026-08-04 (even later): all committed (mayo-ba develop=prod=4fe6704
  pushed + PROD-DEPLOYED — live checks green: mayo-app.com/privacy-policy
  serves the new policy, server.mayo-app.com/delete-account renders the
  form, garbage-token confirm → Ups page; mayo-mobile master 4c63757,
  not pushed).
- ⏳ **Pick up here — Play Store production checklist** (account is an
  ORGANIZATION → exempt from the 12-tester/14-day closed-testing rule):
  1) ~~deploy privacy policy~~ DONE; 2) ~~account deletion flow~~ DONE +
  deployed to prod; 3) ~~in-app privacy-policy link~~ DONE (in dane
  screen) — **v4 AAB BUILT 2026-08-04** (versionCode 4, upload-key signed
  CN=Mayo, RC key + dane screen verified inside the bundle; note: Hermes
  stores non-ASCII strings as UTF-16 → grep the bundle with ASCII-only
  strings) at android\...\bundle\release\app-release.aab.
  **STATUS 2026-08-05:** user TESTED the v4 build (dane screen, delete
  user, privacy policy — all work). Play Console progress this session:
  Data safety COMPLETE (collects email [app functionality] + purchase
  history [app functionality], no sharing, encrypted in transit,
  account-creation method "Username and other authentication", delete
  URL https://server.mayo-app.com/delete-account, partial-data
  deletion = No); App access filled with review account
  **mayoreview0@gmail.com** — that account is SEEDED IN PROD DB
  (user row + Purchase id 119, productId app-subscription,
  stripeCustomerId 'play-review-seed') so reviewers skip the paywall
  WITHOUT paying; do NOT buy a real sub for it. If someone runs "usuń
  konto" on it, re-seed the same way (node+Prisma one-liner over SSH,
  DATABASE_URL from sudo grep ~/mayo-ba/.env). USER still must create
  the actual Gmail inbox (no 2FA) + put its password in the form.
  **Store-listing assets GENERATED → E:\mayo-mobile\store-assets\**
  (icon-512.png, feature-graphic-1024x500.png, 3× framed 1080×1920
  screenshots; PL name/short/full description texts drafted in chat —
  short: "najlepsze modowe perełki z Vinted — codziennie świeże
  znaleziska w jednym feedzie"). Made with headless Chrome
  (--headless=new --screenshot --window-size) compositing raw emulator
  screencaps + brand assets; template in session scratchpad.
  **Store listing progress (evening 2026-08-05):** icon, feature graphic
  and the 3 phone screenshots are UPLOADED in the Default (pl-PL)
  listing. **NEXT SESSION — REMAINING:** 1) paste short + full PL
  descriptions (final texts live in this file's sibling
  store-assets\listing-texts.md); 2) tablet screenshots 7" + 10" are
  REQUIRED → reuse the SAME 3 phone PNGs from the asset library
  (1080×1920 satisfies both: 7" needs sides 320–3840, 10" needs sides
  ≥1080); 3) content rating IARC (all "no", digital purchases = yes);
  4) target audience 18+; 5) App access: USER creates the
  mayoreview0@gmail.com inbox (no 2FA) + password into the form + tick
  "full access" checkbox (prod DB already grants it access); 6)
  countries=PL → promote v4 to Production → submit for review (1–7
  days). Google Sign-In NOT required.
  Emulator recipe additions 2026-08-05: if adb shell hangs/screencap
  returns 0 bytes with system_server DEAD_OBJECT → snapshot boot is
  wedged, `adb emu kill` + relaunch with `-no-snapshot-load`; Expo Go
  floating gear FAB over the header: dev menu (tap FAB) → toggle
  "Tools button" OFF; feed data caches — pull-to-refresh (swipe down)
  after DB edits; local test items cleaned (Mohito id 10 size fixed,
  tags cleared) — VintedItemTag enum is still placeholder tag1..tag5
  (rename = schema migration, backlog); prod catalog has only 1 test
  item (baby onesie) — local DB is the better screenshot source.
  JWT_SECRET is IDENTICAL local↔prod (verified via md5) so emulator
  tokens work against prod if env.ts is temporarily forced to
  PROD_BACKEND_URL. Re-login trick after signOut in emulator: enter
  email → "wyślij link" → flip isTokenActivated=true in local DB → app
  polls itself back in.
  Still open besides checklist: advent calendar screen, rename
  VintedItemTag placeholders, prune unused Stripe subscription code
  from mayo-ba, iOS (Apple Developer enrollment in progress →
  RevenueCat iOS app + EXPO_PUBLIC_REVENUECAT_IOS_KEY + App Store
  Connect product later).
- ✅ 2026-08-18: **APP IS LIVE IN PRODUCTION** (v4, 100% rollout, first
  install). Session work:
  1. **Login keyboard fix** (login.tsx): KAV `behavior="padding"` on
     Android too — edge-to-edge OVERLAYS the keyboard without resizing
     the window, so KAV must shrink the viewport itself (when the window
     does resize, measured overlap is 0 → no-op) — plus keyboardDidShow
     listener → 150ms-delayed scrollToEnd (delay beats Android's own
     scroll-focused-input nudge; without it only the input, not the CTA,
     was visible). Verified on user's phone (input + CTA above keyboard).
  2. **Deep-link login DONE (Android App Links)** — magic link opens the
     app directly instead of the browser page:
     - mayo-ba: `POST /auth/activate/:token` (JSON, 400 = bad/expired;
       HTML GET page stays as browser fallback), `GET
       /.well-known/assetlinks.json` (package com.mayoapp.mobile,
       fingerprints: upload key 11:C9:...D4:3D + Play app-signing key
       F7:9E:...87:D9 — Play page: Protected with Play → direct URL
       .../keymanagement, "App signing" moved out of Test and release),
       SendGrid clickTracking OFF on both login mails (ct.sendgrid.net
       redirect would open the browser, not the app). Deployed to prod
       (develop=prod=594fb14).
     - mayo-mobile: app.json android.intentFilters autoVerify https
       server.mayo-app.com pathPrefix /activate-user; new route
       `src/app/activate-user/[token].tsx` ("Logujemy Cię… 🎉" →
       authApi.activateToken → 1s-poll refreshActivation until signedIn
       → '/'; signedOut → /login; failure → Ups + wróć); verified e2e in
       emulator via `exp://<ip>:8081/--/activate-user/<token>` (token
       from DB user.lastToken via node+Prisma one-liner).
     - **v5 AAB BUILT** (versionCode 5, upload-key signed, intent filter
       + versionCode verified in merged manifest) at
  android\app\build\outputs\bundle\release\app-release.aab — NEXT: user
       v5 to Play production. App Links only work in the store build
       (Expo Go can't register them; dev keeps using the polling flow).
  3. Committed: mayo-mobile master 64ff207 (not pushed), mayo-ba
     develop=prod=594fb14 (pushed + deployed).
  4. (later) **v5 LIVE + deep link VERIFIED WORKING on the user's phone.**
     Post-release debugging, all resolved:
     - v5 install failed at ~20% on the phone → fixed by clearing the Play
       Store app's cache (fresh-release CDN propagation).
     - Magic link still opened the BROWSER: App Link verification failed
       on the phone (while the upload-key build verified fine on the
       emulator). ROOT CAUSE: **the Play Console App-signing UI shows only
       2 keys (hybrid classical + PQC), but "Download certificates" gives
       THREE .der files — deployment_cert (SHA-256 6A:5B:D1:...) is what
       actually signs APKs Play delivers**, and it wasn't in
       assetlinks.json. Fix: keytool -printcert -file on each .der →
       assetlinks now lists ALL FOUR fingerprints (upload 11:C9, deployment
       6A:5B, classical F7:9E, PQC 5B:BC) — mayo-ba develop=prod=c089279,
       deployed.
     - ⚠️ Google DAL cache: Android verifies via
       digitalassetlinks.googleapis.com, which CACHES the file (~40 min
       observed; our response has no Cache-Control, only ETag — adding
       max-age would shorten this). Check what Google sees:
       `curl "https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://server.mayo-app.com&relation=delegate_permission/common.handle_all_urls"`
       Wait for it to show the new file BEFORE reinstalling to re-verify.
     - Emulator app-link test recipe: install release APK (assembleRelease,
       ~same manifest as AAB), then `adb shell pm get-app-links
       com.mayoapp.mobile` (state "none" right after install), `adb shell
       pm verify-app-links --re-verify com.mayoapp.mobile`, re-check →
       "verified"; `am start -a android.intent.action.VIEW -d
       "https://server.mayo-app.com/activate-user/test"` must resume
       com.mayoapp.mobile/.MainActivity, not a browser.
     - ℹ️ E:\mayo-ba is checked out on branch **prod** now (user switched
       to it at some point — a stale prod checkout is what briefly looked
       like reverted files this session; ff-merged back). develop and prod
       both point at c089279.
     - Long-press → "Open in browser" in Gmail ALWAYS bypasses the app —
       only normal taps go through App Links (matters when testing).
  Session gotchas: PowerShell `>` MANGLES binary (adb exec-out screencap
  → corrupt PNG w/ BOM) — do screencaps from the Bash tool; emulator
  Gboard shows a floating pill toolbar (AVD reports hardware keyboard) —
  pill hamburger menu → "Show on-screen keyboard" gets a FLOATING
  keyboard (couldn't dock it; phone testing is more honest for keyboard
  UX); user phone screenshots arrive as .jfif → copy to .jpg to Read
  them; stale mayo-ba from a previous session may hold port 3003 (nest
  watch dies with EADDRINUSE and does NOT respawn on mtime-only touch —
  kill the old tree via Get-CimInstance parent chain + restart fresh);
  PC has TWO LAN IPs now: Ethernet 192.168.0.105 (lower metric — Metro
  advertises it, dev CLIENT_URL set to it) and WiFi .104. Emulator is
  signed in as emutest again (fresh magic-link session from the deep-
  link test). ⚠️ 2026-09-06: IPs moved AGAIN — Ethernet **.108** (Metro),
  WiFi .103; mayo-ba dev CLIENT_URL still says .105 (only matters for
  phone magic-link clicks; emulator uses the DB-flag trick).

- ✅ 2026-09-06: **dane screen redesigned** to the Claude Design
  personal-data template (see app/dane.tsx notes in App structure); new
  icons arrow-up-right.svg + alert-octagon.svg; profile-menu push→navigate.
  Verified in emulator (layout, Regulamin opens Chrome, dane→dane→back
  lands on feed). **platnosc screen redesigned** to the my-subscription
  template (see app/platnosc.tsx notes) + `getSubscriptionInfo()` added to
  purchases.ts; verified layout in emulator (date row untestable in Expo
  Go). **paywall redesigned** to the paywall template (see paywall.tsx
  notes; new check-muted.svg). emutest's dev-grant Purchase row was
  deleted + re-inserted (stripeCustomerId 'dev') during the test.
  **Product card updated** to the current product-detail template (see
  vinted-item-card.tsx "round 3" notes; new icons chevron-down-dark,
  chevron-up-dark, link-dark, shield-check-blue).
  ⚠️ **PRICE DISCREPANCY found 2026-09-06:** Google Play charges **54,99 PLN**
  (user's own Play account, RC shows $15) while the app/design hardcoded
  45,00 zł. Fix: `getSubscriptionPrice()` in purchases.ts (current offering →
  first package → `product.priceString`, VAT-incl. store string, cached;
  waits for the in-flight identifyPurchaser via `sdkReady()` so screens that
  mount right after sign-in don't race configure()). paywall.tsx + platnosc.tsx
  render it; the literal '45,00 zł' survives only as FALLBACK_PRICE for Expo
  Go / no offering. OTA-published: group
  6cfa6d5d-cb68-45ba-bf7d-ed1f037b676a (commit ed78215), verified key
  present + live launchAsset hash == local export hash.
  Then: 2nd-Google-account purchase test on the phone (app login
  krys.nagorny+pmror) failed with RC **code 4 PURCHASE_INVALID_ERROR** ("One
  or more of the arguments provided are invalid") — Play refused before the
  sheet; likely causes: that Google account never installed the app via Play
  (not in its library), Play country ≠ PL (app is PL-only), no payment
  method; ⚠️ non-licence-tester accounts pay REAL 54,99 PLN. The breadcrumb
  had dropped Play's reason: the RN bridge rejects with (code, message,
  infoMap) → fields live on `error.userInfo` (readableErrorCode,
  underlyingErrorMessage), not the root. `describePurchaseError` now logs
  userInfo — commit 77d5837, **OTA group
  8bce4678-aea8-40bd-afdf-8989a4e90a6f is CURRENT LIVE** (verified key +
  hash). RESOLVED same day — Play's raw response (app login pmror@mayo-app.com,
  Play account pmror@mayo-app.com, app reinstalled): `DEVELOPER_ERROR —
  "Account identifiers don't match the previous subscription"`, Play dialog
  "We are unable to change your subscription plan", and the Play sheet (when
  it did appear) said "Starting 18 Sept 2026 … first charge 18 Sept" on the
  MAIN account's Mastercard. Meaning: the DEVICE already carries an active
  mayo_monthly subscription (Krys's main Google account, bought under the
  patrycja app login, renews 18 Sept), so Play turns any new mayo purchase
  on that phone into a deferred PLAN CHANGE of that subscription; RC stamps
  the new purchase with obfuscatedAccountId = hash(app_user_id pmror) ≠ the
  original (patrycja) → Play refuses. Not an app bug; can't be fixed in code.
  To test a fresh purchase: a device WITHOUT the main Google account signed
  in (remove it from the phone, or a second phone — the Pixel_7 AVD is a
  google_apis image with no Play Store), Play country PL, and add the test
  account as a licence tester (else real 54,99 PLN). Product follow-up
  (real-user scenario): same Google account, different app email → code 6
  "already active" + no access; would need restore/TRANSFER handling (RC
  TRANSFER webhook event is currently ignored by mayo-ba).
  Account state after the sort-out (user, 2026-09-06): phone Play account =
  krys.nagorny@gmail.com (its mayo sub is set to cancel, expires 18 Sept);
  app login = patrycja.musur@gmail.com (the RC subscriber) → works.
- ✅ 2026-09-06 (later): `src/components/home-logo.tsx` — top-bar logo is a
  link (router.navigate to /home if hasAccess else /paywall); used on dane,
  platnosc, paywall (home keeps the plain MayoLogo). Card CTA "Dodaj sosu,
  żeby wystylizować" wrapped to 2 lines on the user's ~360dp phone (emulator
  is 412dp) → `numberOfLines=1 + adjustsFontSizeToFit + minimumFontScale 0.8`,
  paddingHorizontal 24→16. Emulator recipe for narrow phones: `adb shell wm
  density 480` (1080px → 360dp), `adb shell wm density reset` after.
  Commit 6e4de05 → OTA group d228a08f-cdf7-4b49-ac5a-e1b9f34b3961 (superseded).
- ✅ 2026-09-06 (evening): app-header template implemented (bare "Mój profil"
  + "Filtruj"), menu copy Moje dane / Subskrypcja / Wyloguj, filter-sheet
  safe-area fix (see component notes). Commit a0f1a14 → OTA group
  f81851b9-2746-48df-a00b-b87963253750 (superseded). Then smaller "Usuń konto"
  on dane (commit 277783a) → **OTA group 4e9ae519-dde7-4450-b0d5-a910585dec33
  is CURRENT LIVE** (RC key present, live launchAsset hash == local export).
  master still NOT pushed to GitHub.
- ✅ 2026-09-06 (night): **v6 AAB BUILT** (commit 963c45b, versionCode 6,
  upload-key signed CN=Mayo, verified in bundle: versionCode 6, RC key, new
  header/menu copy, launch-update code) at
  androidppuild\outputsundle
eleasepp-release.aab — NEXT: user
  uploads to Play production. New in v6: `useLaunchUpdate()` in _layout.tsx
  holds the splash up to 8s for checkForUpdateAsync → fetchUpdateAsync →
  reloadAsync, so an OTA shows on the FIRST open (v5 users only ever got it
  on the 2nd launch; a fresh v5 install ran the stale embedded August JS
  once). app.json `updates.checkAutomatically: ON_ERROR_RECOVERY` (manifest
  EXPO_UPDATES_CHECK_ON_LAUNCH=ERROR_RECOVERY_ONLY, edited directly in
  android/ — no prebuild run) so the native check doesn't race the JS one.
  Runtime version stays 1.0.0 (no native module changes) → the same OTA
  channel serves v5 and v6. Expo Go: Updates.isEnabled false → check
  skipped. Build recipe unchanged (gradlew bundleRelease, JAVA_HOME=Android
  Studio jbr, GRADLE_USER_HOME=E:\gradle-cache, ~13 min). master is many commits
  ahead and still NOT pushed to GitHub. Subscription reconciliation (same day): RC's single paid subscriber
  (patrycja, INITIAL_PURCHASE 08-18 10:47, $15, renewing) IS the "mayo"
  subscription on Krys's own Google account (renews 18 Sept) — the app was
  logged in as patrycja on a device using Krys's Google account. Play = one
  sub per product per GOOGLE account → Krys's phone gets RC error code 6
  "This product is already active for the user" for any app login; DON'T
  restore purchases on a test login (RC would TRANSFER it → webhook revokes
  patrycja). wojryba: INITIAL_PURCHASE 08-18 14:04 → CANCELLATION 14:09 →
  EXPIRATION 08-25 (trial ended) — his purchase did work. All of it COMMITTED
  (master fa4a016, not pushed) and **published OTA** to channel production
  (update group b789a8e5-650e-40de-be38-3f7601f25741, runtime 1.0.0,
  commit fa4a016) — supersedes the 08-18 diagnostics update; users get it
  on the 2nd launch. ⚠️ Fast Refresh can silently drop ("Cannot connect to Expo CLI"
  toast) — if a screenshot shows stale UI, force-stop Expo Go and re-open
  the exp:// URL. tsc clean. NOT committed. Dev flow this session:
  backend `npm run start:dev` (mayo-ba on branch prod) + `npx expo start
  --go` + Expo Go on Pixel_7 (see Running & testing).

- 🔎 2026-08-18 (payment debug): **prod user wojryba@gmail.com — paywall CTA
  spins forever.** Server showed NOTHING (expected: store billing never touches
  mayo-ba until the RC webhook; his token-validation + subscription-status
  polls were the only trace — meanwhile patrycja.musur@gmail.com purchased
  fine the same day, so the RC→webhook pipeline works; hang is on-device in
  `purchaseSubscription()`). Diagnostics added:
  - mayo-ba: `POST /auth/client-log` (AuthGuard, body `{message}`, logs
    `[ClientLog] <email>: <msg>` capped 2000 chars) — develop=prod=1144a53,
    deployed (verified 401 live). Grep prod: `grep ClientLog ~/.pm2/logs/main-out.log`.
  - mobile: `purchaseSubscription(log?)` posts breadcrumbs (isConfigured,
    offerings/package ids, purchase done/cancelled) + rejects instead of
    hanging (30s timeout getOfferings, 5min purchasePackage);
    `describePurchaseError()` flattens RC's non-enumerable error fields
    (message/code/readableErrorCode/userCancelled/underlying); paywall CTA +
    both swallowed `identifyPurchaser` catches now post via
    `authApi.clientLog`. Commit 3378e7a (not pushed), published **OTA**
    (update group 7998a073-6a96-4935-b9c0-b5c95ffd4689, runtime 1.0.0).
    User must relaunch the app TWICE to get it, then retry payment →
    breadcrumbs land in pm2 logs. ⚠️ eas-cli non-interactive gotcha:
    `--non-interactive` also requires `--environment production`.

## EAS Update — OTA JS updates (set up 2026-08-18, ships with v5)

JS/asset changes can be pushed WITHOUT a Play release: `npx eas-cli update
--channel production --message "<what changed>"` in E:\mayo-mobile. Users get
it on the next TWO app launches (downloaded in background on launch 1,
applied on launch 2). Native changes (new modules, app.json android config,
versionCode) still need a store build.

- EAS project: `@krychuqs-team/mayo`, id fc3f0417-d74f-4ece-a0cb-86c36cb8547e
  (app.json slug renamed mayo-mobile → mayo to match; `extra.eas.projectId` +
  `owner` set). Account: krychuq / krys.nagorny@gmail.com (free tier, OTA up
  to ~1k MAU). CLI login persists on this PC (`npx eas-cli whoami`).
- runtimeVersion policy = **appVersion** → runtime "1.0.0". ⚠️ Updates only
  reach builds with the SAME runtime version: after ANY native change, bump
  `version` in app.json (e.g. 1.0.1) or old installs would fetch incompatible
  JS. Channel "production" is embedded via `updates.requestHeaders`
  (`expo-channel-name`) — REQUIRED because we build locally with gradle, not
  EAS Build (channel created with `eas channel:create production`).
- ⚠️ Build-memory gotcha: expo-updates pushed the Gradle daemon over its
  512 MiB Metaspace → a batch of `compileReleaseKotlin FAILED` with no error
  text. Fix (done): `org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m`
  appended (BOM-free, via bash printf) to E:\gradle-cache\gradle.properties.
- Expo Go dev flow is unaffected (updates config is inert there).
- ⚠️⚠️ **`--environment production` IGNORES the local `.env`** (learned the hard
  way 2026-09-06): the bundle is built with EAS *server-side* env vars for that
  environment only. The EAS production env was EMPTY, so the design-round OTA
  (group b789a8e5) shipped WITHOUT `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` →
  `nativeBillingAvailable()` false → paywall CTA showed "Płatności działają w
  aplikacji z Google Play" on the STORE build (user hit it on the phone). Very
  likely the 08-18 diagnostics OTA (group 7998a073) had the same defect
  (same flags, same empty env; CDN 403s non-client downloads so unproven) —
  i.e. payments were probably broken for updated users 08-18 → 09-06.
  FIX (done): `npx eas-cli env:create --environment production --name
  EXPO_PUBLIC_REVENUECAT_ANDROID_KEY --value goog_… --visibility plaintext
  --scope project --type string --non-interactive` (deprecated alias of
  `eas env:set`; `eas env:list --environment production` to check — NO
  `--non-interactive` on env:list), then republished → group
  **bad68515-bede-4aac-8811-8f999f851b4f** (commit a0a3f27) is live and
  VERIFIED: local export contains the key AND its sha256 (base64url) equals
  the live manifest's launchAsset.hash. **Every future EXPO_PUBLIC_* var must
  be added to the EAS env too.** Verify a publish: `grep -l <key>
  dist/_expo/static/js/android/*.hbc` right after `eas update` (dist/ is the
  export), and/or fetch the manifest: `curl https://u.expo.dev/<projectId>
  -H "expo-channel-name: production" -H "expo-runtime-version: 1.0.0" -H
  "expo-platform: android" -H "expo-protocol-version: 1" -H "accept:
  multipart/mixed"` and compare launchAsset.hash to the local file's hash.

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

- ~~Deep linking (Phase 2)~~ DONE 2026-08-18 (see that session entry): App Link on
  https://server.mayo-app.com/activate-user/*, assetlinks.json served by mayo-ba,
  in-app /activate-user/[token] route. Ships with the v5 AAB.
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
