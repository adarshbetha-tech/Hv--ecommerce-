# 14 — Animation and Interaction Findings (from video)

Supersedes the all-unknown table in [04](04-animation-and-interaction-spec.md) where marked. Evidence: 4 fps frames for 0–8 s, 1 fps for the rest. Timing resolution is coarse; anything under 250 ms cannot be distinguished from an instant change. The recording contains **no hover, click, tap, keyboard or resize interactions**.

| # | Element | Trigger | Initial → Final | Properties | Timing | Repeats | Scroll-dependent | Confidence |
|---|---|---|---|---|---|---|---|---|
| A1 | Second (shipping/COD) announcement bar | Time (autoplay) | Message "FREE Standard Shipping…" → "Cash on Delivery…" at ≈ 2.25 s | Text swap | Complete within ≤ 0.25 s; interval between messages unknown (≥ 2.25 s since load) | Presumably (arrows present) | No | Observed swap; cycle length unknown |
| A2 | Top announcement bar | Time | Same message throughout 0–8 s | — | Interval > 8 s or paused | Unknown | No | Observed (no change) |
| A3 | Hero slider | Autoplay | "Neodymium Magnets" (slide 3) → "Hand Tools" (slide 4) at ≈ 2.75 s | Slide change | Complete within ≤ 0.25 s (hard cut or very fast fade); slide dwell ≥ 2.75 s | Likely loop | No | Observed change; transition style/interval unknown |
| A4 | Hero controls | Static | 4 dots, 4th active, prev/next, pause button | — | — | — | — | Observed |
| A5 | Header / bars | Scroll | Scroll out of view; **not sticky** | Normal flow | — | — | Yes | Observed |
| A6 | Logo strip | Continuous | Logos translate left ≈ 33–36 px/s in 960-px-wide frames → **≈ 70 px/s** at 1920 | translateX | Linear (constant speed across 3 samples) | Loops continuously | No | Estimated from 3 samples |
| A7 | Category tiles | Scroll into view | Rows at viewport bottom appear partially transparent, then fully opaque as scrolled up | Opacity (likely + small translateY — not distinguishable) | Fade completes within ≈ 1 s of entering | Once (rows stay opaque above) | Yes (IntersectionObserver-style) | Observed fade; easing/duration estimated |
| A8 | Product rails / section content | Scroll into view | Faint headings and first row at viewport bottom (e.g. "Mini Assorted Packs", "Blog posts", "Power Tools" appear faded at the edge) | Opacity | ≈ 0.5–1 s | Once | Yes | Observed |
| A9 | Review carousel | Static during video | 4 cards with arrows; no auto-advance seen | — | — | — | — | Observed (no change over ~2 s on screen) |
| A10 | WhatsApp button | Scroll | Remains fixed bottom-left | position: fixed | — | — | No | Observed |
| A11 | "Install App" label | Page end | Appears at bottom-left near footer | — | — | — | Yes | Observed |
| A12 | Parallax / sticky sections / scroll-linked transforms | — | None observed | — | — | — | — | Observed absence (at 1 fps) |

## Implementation guidance for VERTEX
- A7/A8: reuse existing `.vtx-reveal` + `IntersectionObserver` (already in `App.jsx`, skipped when `prefers-reduced-motion`). Existing transitions use 0.25 s `cubic-bezier(0.16,1,0.3,1)` — match reference "fast fade" without new libraries. [PROPOSED]
- A1/A3: carousels as small React components; swap with ≤ 250 ms opacity transition; autoplay interval a **proposal** (e.g. 5 s) because the reference's is unknown; pause on hover/focus and via the visible pause button; no autoplay under reduced motion. [PROPOSED]
- A6: CSS `@keyframes` marquee ≈ 70 px/s, `animation-play-state: paused` on hover/focus and `none` under reduced motion. [PROPOSED value from estimate]
- A5: leave header non-sticky unless owner wants sticky; VERTEX header is currently `position: sticky` in `App.css` (line ~229) — decide explicitly. [DECISION NEEDED]

## Still unknown (needs more footage)
Mega-menu animation, dropdown timing, product-card hover (image swap, zoom, lift), button hover colors, search suggestions, cart notification entrance, slider autoplay interval and transition curve, mobile menu animation, focus rings, form validation feedback, stepper press behavior.
Requested capture: a second recording with (1) hover over Shop/Your Order/Socials, (2) hover on 3 product cards and 3 category tiles, (3) click + on a stepper and add to cart, (4) press search and type, (5) the same page at ≈ 390 px width, (6) leave the hero idle for 30 s.
