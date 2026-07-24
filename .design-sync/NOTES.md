# design-sync notes — mayo

- This repo (E:\mayo-mobile) is an Expo/React Native APP, not a web design-system
  package: no dist/, 3 app-specific RN components. The user chose a **tokens-only
  sync** (2026-07-23): brand colors/typography as CSS variables + the mayo utility
  vocabulary ported 1:1 from mayo-dashboard `src/styles.scss` (which itself mirrors
  mayo-fe SCSS and src/lib/theme.ts here). No component bundle, no `_ds_sync.json`
  anchor — a future re-sync re-verifies/re-authors everything by hand.
- Bundle is hand-authored into `ds-bundle/` (styles.css + tokens/ + fonts/ + README).
  The converter (`package-build.mjs`) was NOT run — nothing here for it to build.
- Fonts: Inter 400/600/700 TTFs copied from `node_modules/@expo-google-fonts/inter/`.
- Source of truth for the vocabulary: `E:\mayo-dashboard\src\styles.scss`. If that
  file changes (new tokens/classes), re-port it into `ds-bundle/styles.css` and
  re-upload.
- Brand rule worth keeping in conventions: ALL user-facing copy is Polish, playful
  lowercase; "magic link" stays English.
