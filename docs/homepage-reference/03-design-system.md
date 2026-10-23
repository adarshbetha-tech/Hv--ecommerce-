# 03 — Design System

**Evidence status: no computed styles or screenshots were obtainable.** Every visual token below is `[UNKNOWN]` unless noted. Do not guess values from this file; capture them with DevTools.

## Observed facts
| Token | Value | Evidence / confidence |
|---|---|---|
| Currency format | `₹1,210.00` (Indian rupee, two decimals) | Observed, high |
| Sale pattern | Struck-through compare-at + "Sale" label | Observed, high |
| Theme-color meta | empty | Observed |
| Image widths requested | 533 (cards), 1500 (bearings tiles), 3200 (categories), 3840 (hero) | Observed from URL params |
| Fonts | Product images contain "League Spartan" in filenames (suggests brand uses it in artwork) | Inferred, low — not evidence of site font |
| Icon style | Emoji used in announcement/hero text (🤑 🪛 💬 📞 🎶) | Observed |

## Required captures (UNKNOWN today)
Primary/secondary/accent colors; page/surface/text/muted/border colors; font families and weights; type scale and line heights; button height/padding/radius; card radius/shadow; container max-width; section vertical padding; grid gaps; image aspect ratios; icon stroke.

## Proposed CSS variables (placeholders — fill after capture)
```css
:root {
  /* colors — [PROPOSED], values TBD from DevTools */
  --color-primary: /* TBD */;
  --color-accent: /* TBD */;
  --color-bg: /* TBD */;
  --color-surface: /* TBD */;
  --color-text: /* TBD */;
  --color-text-muted: /* TBD */;
  --color-border: /* TBD */;
  --color-sale: /* TBD */;
  /* type */
  --font-body: /* TBD */, system-ui, sans-serif;
  --font-heading: /* TBD */, system-ui, sans-serif;
  /* layout */
  --container-max: /* TBD */;
  --section-gap: /* TBD */;
  --grid-gap: /* TBD */;
  --radius-card: /* TBD */;
  --shadow-card: /* TBD */;
  --motion-fast: 150ms;   /* [PROPOSED] */
  --motion-base: 300ms;   /* [PROPOSED] */
}
```
Map these onto VERTEX's existing tokens/Tailwind config once 07 is completed; do not introduce a parallel system.

## Component specs
Buttons, form fields, cards: `[UNKNOWN]`. Observed only: buttons labelled "Buy Now!", "Click here", "View all", "View cart", "Checkout", "Continue shopping", "Send"; form fields use required markers (*).

## Update from video analysis
Measured values now exist: see [12-video-visual-measurements.md](12-video-visual-measurements.md) (announcement/dark band `#111111`, hero grey `#e4e4e4`, brand purple ≈ `#6e0cf4`, form band `#252433`, container ≈ 1500–1520 px at 1920). Fonts and exact radii remain `[UNKNOWN]` (DevTools needed).
