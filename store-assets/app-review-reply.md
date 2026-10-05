# App Review reply — Guideline 2.1 "Information Needed" (received 2026-10-05)

Draft answers for the reply in App Store Connect (and for the Notes field).
Point 6 must only say what is true about third-party content (no claim of rights we do not hold).

---

Hello,

Thank you for the review. Below is the requested information for Mayo (1.0, build 2).

**1. Screen recording**

Attached. It was captured on a physical iPhone and shows: app launch, sign-in with a passwordless magic link, the paywall (subscription title, length, price, Terms of Use and Privacy Policy links), starting the subscription with a free trial, the main feed and filters, the subscription screen, and account deletion.

**2. Purpose and target audience**

Mayo is the app of the fashion creator pmror (Instagram @pmror_, about 34,000 followers: https://www.instagram.com/pmror_/ — her profile links to mayo-app.com), who recommends second-hand clothes and shows how to style them. Browsing second-hand marketplaces takes hours; she hand-picks the best pieces and presents them in one simple feed, each with her own styling inspiration ("sos" — outfit photos showing how to wear the item). Every item links to the original listing, where the user buys it as usual. The target audience is adults in Poland interested in second-hand fashion and in her style. The value is saved time and curated, styled picks from a creator they follow.

**3. How to access the app**

- Demo account: mayoreview0@gmail.com (also in the App Review Information section).
- Open the app, type the demo email and tap "Wyślij magic link do logowania". The demo account is signed in automatically within a few seconds — no mailbox access or password is needed. It already has an active entitlement on our backend, so the full feed is unlocked.
- Regular users sign in with a passwordless magic link: they enter their email, receive a link by email and tap it. To see this flow and the paywall, sign in with any email address you have access to — a new account receives the link by email and then sees the paywall.
- Main features: the feed (swipe vertically between items, swipe photos horizontally), "Filtruj" (price range and tags), "Dodaj sosu, żeby wystylizować" (shows styling photos), "Zobacz na Vinted" (opens the original listing), and "Mój profil" (account data, subscription, sign out, account deletion).

**4. External services**

- Apple In-App Purchase (StoreKit) — subscription billing.
- RevenueCat — subscription status management.
- Twilio SendGrid — sending the sign-in email.
- Amazon Web Services — hosting of our own backend API and images (EU region).
- Expo / EAS Update — app framework and updates of the JavaScript bundle.
- Listings shown in the feed link to vinted.pl, where the purchase of the item takes place outside the app.

No AI services, advertising or analytics SDKs are used.

**5. Regional differences**

The app and the subscription are available in Poland only. The interface and content are in Polish. There are no regional differences in features.

**6. Third-party material**

Mayo is the app of the fashion creator pmror. She personally selects the items she recommends and shows how to style them; the styling photos and commentary are her own content. The recommended items are publicly listed for sale by third parties (mostly on Vinted, sometimes in other shops, occasionally her own items). For each one the app shows a short preview and a link to the original public listing, where the purchase takes place. Mayo is not affiliated with Vinted or the sellers and does not sell the items shown.

**7. In-App Purchase**

One auto-renewable subscription: "Mayo Standard" (product ID mayo_monthly), 1 month, 54,99 zł per month, with a 7-day free trial for new subscribers. It unlocks access to the feed. Navigation: sign in with a new account (any email other than the demo account) → the paywall appears immediately after sign-in → tap "Wypróbuj za 0 zł". The paywall shows the subscription title, length and price, the auto-renewal terms, and links to the Terms of Use ("Regulamin") and Privacy Policy ("Polityka prywatności"). An existing subscription can be managed under "Mój profil" → "Subskrypcja".

Note: in TestFlight / sandbox the price label may be shown for the US storefront ($11.99) on some devices; on the Polish App Store storefront it is 54,99 zł.

Best regards,
Krystian Nagórny
