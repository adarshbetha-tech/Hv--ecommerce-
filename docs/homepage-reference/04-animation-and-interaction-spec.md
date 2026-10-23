# 04 — Animation and Interaction Specification

**No motion was observed or testable** (text fetch only: no hover, scroll, click, reduced-motion testing). No animation library has been identified. Items below are inferences from markup text, or proposals, and are labelled.

## Inventory
| Element | Trigger | Initial → Final | Properties | Duration/Easing | Repeats | Scroll-dependent | Mobile | Reduced motion | Confidence |
|---|---|---|---|---|---|---|---|---|---|
| Announcement bar (3 messages) | Time? | Message A → B → C? | UNKNOWN | UNKNOWN | UNKNOWN | No | UNKNOWN | UNKNOWN | Unknown (3 messages present; cycling inferred only) |
| Hero slideshow (4 banners) | Autoplay/arrows/swipe? | Slide n → n+1 | UNKNOWN | UNKNOWN | UNKNOWN | No | UNKNOWN | UNKNOWN | Inferred (multiple banner images) |
| Blog slider | Arrows/swipe? | Counter "1 / of 3" | UNKNOWN | UNKNOWN | UNKNOWN | No | UNKNOWN | UNKNOWN | Inferred (counter text) |
| Cart notification | Add to cart | Hidden → visible | UNKNOWN | UNKNOWN | Per add | No | UNKNOWN | UNKNOWN | Inferred (text present) |
| Mega menu / drawer | Hover/click | Closed → open | UNKNOWN | UNKNOWN | Per use | No | Drawer inferred | UNKNOWN | Inferred (duplicated nav markup) |
| Assorted pack cards (2 images) | Hover? | Image 1 → image 2 | UNKNOWN | UNKNOWN | Per hover | No | likely none | UNKNOWN | Unknown (two images per card is the only evidence) |
| Section reveals, parallax, sticky header, product-card lift, button transitions | — | — | — | — | — | — | — | — | Unknown / not observed |

## Proposed baseline (VERTEX defaults, NOT reference values)
- Transitions 150–300 ms ease-out on color, transform, opacity only.
- Sliders: pause on hover/focus, visible controls, swipe on touch.
- All non-essential motion gated by `@media (prefers-reduced-motion: reduce)`; autoplay disabled in that mode.
- Prefer CSS and the animation tooling VERTEX already uses; add no new library for simple effects.

## Needed to complete this file
Screen recording (load + full scroll + hover on header, cards, hero; mobile menu open/close; add to cart), or DevTools Animations/Performance capture.

## Update from video analysis
Observed timings, marquee speed (~70 px/s est.), scroll fade-ins and non-sticky header are recorded in [14-video-animation-and-interaction-findings.md](14-video-animation-and-interaction-findings.md). Hover/click/mobile motion is still unknown.
