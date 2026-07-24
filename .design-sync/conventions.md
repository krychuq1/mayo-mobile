# mayo — brand conventions

mayo is a Polish second-hand fashion brand ("każdy fit potrzebuje sosu"). This project
ships **tokens + a small CSS vocabulary only — there are no library components**; build
screens with plain HTML/React styled from `styles.css`.

## Setup

No provider or wrapper is needed. `styles.css` already styles `body` (Inter font, warm
gradient background `linear-gradient(349deg, var(--mayo-bg-deep), var(--mayo-bg))`) and
headings (`h1`–`h3` render in brand blue, weight 700). Inter 400/600/700 is bundled via
`@font-face` — do not import fonts from the network.

## Styling idiom

Style with the CSS variables and the small class vocabulary below — never hardcode hex
values, never invent new `--mayo-*` names or `.btn`-style classes.

Tokens (defined in `tokens/tokens.css`):
`--mayo-orange` (primary/CTA) · `--mayo-blue` (headings/links) · `--mayo-text` ·
`--mayo-bg` / `--mayo-bg-deep` (gradient ends) · `--mayo-error` · `--mayo-border` /
`--mayo-border-focus` · `--mayo-placeholder` · `--mayo-white` (text on orange) ·
`--mayo-muted` · `--mayo-card-shadow`.

Classes (defined in `styles.css`):
- `.btn` — orange pill button (radius 28); modifiers `.btn--secondary` (white/blue,
  bordered), `.btn--danger`, `.btn--small`. Disabled = opacity 0.7.
- `.mayo-input` — white input, radius 8, padding 12/16; focus darkens the border.
- `.card` — white card, radius 16, `--mayo-card-shadow`.
- `.error-text`, `.muted` — small status/secondary text.

Radii are part of the brand: buttons 28px (pill), inputs 8px, cards 16px, badges 999px.

## Copy

ALL user-facing copy is **Polish**, playful lowercase brand voice (e.g. "dodaj
przedmiot", "na razie pusto 👀"). The phrase "magic link" stays English. Prices format
as `55,00 zł` (comma decimal, `zł` suffix).

## Where the truth lives

Read `styles.css` (imports `tokens/tokens.css`, `@font-face` for `fonts/*.ttf`) before
styling; `tokens/tokens.json` mirrors the tokens for reference.

## Example

```html
<div class="card" style="max-width: 360px">
  <h2>nowy przedmiot</h2>
  <input class="mayo-input" placeholder="np. sweterek z misiem" />
  <p class="error-text">Email jest wymagany.</p>
  <button class="btn">dodaj</button>
  <button class="btn btn--secondary">anuluj</button>
</div>
```
