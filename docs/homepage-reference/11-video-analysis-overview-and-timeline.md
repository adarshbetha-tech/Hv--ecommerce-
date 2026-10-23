# 11 — Video Analysis: Overview and Timeline

Source: `Screen_Recording_2026-10-21_145319.mp4` (user-supplied), a screen recording of https://onlyscrews.in/ in a desktop browser.
Related: [01 sections](01-homepage-section-inventory.md) · [12 measurements](12-video-visual-measurements.md) · [13 section spec](13-video-section-spec.md) · [14 motion](14-video-animation-and-interaction-findings.md) · [15 VERTEX gap plan](15-video-vs-vertex-gap-and-plan.md)

## Recording facts [OBSERVED]
| Property | Value |
|---|---|
| Duration | 41.9 s |
| Resolution / fps | 1920×1080, 30 fps (H.264) |
| Audio | AAC track present but effectively silent (mean −78.8 dB); **no narration** to transcribe |
| Viewport | Desktop only (~1900 px wide page area; browser UI occupies top ~100 px of the frame) |
| Page state | Fresh load at top → continuous scroll to footer → idle at footer |
| Interactions shown | Scrolling only; mouse cursor moves but no hover target reveals a state change |

## Method
Probed with ffprobe; extracted 1 fps frames (42) at 960×540; tiled into contact sheets and read each; extracted 4 fps frames for 0–8 s to time the announcement bar and hero; sampled pixel colors from full-resolution frames; measured horizontal content extents by pixel scans. Positions below are in **full-resolution frame pixels** unless stated. Timestamps are ±1 s (1 fps) or ±0.25 s (4 fps).

## Timeline
| Time | What is on screen | Notes |
|---|---|---|
| 0–2 s | Top of page: black announcement bar (discount code message), header, black second bar ("FREE Standard Shipping…"), hero slide "Neodymium Magnets" with purple "Buy Now!" | Address bar text selected at t=0 |
| ~2.25 s | Second bar message changes to the Cash-on-Delivery message | Swap is complete within one 0.25 s sample |
| ~2.75 s | Hero changes from "Neodymium Magnets" to "Hand Tools" | Also complete within one 0.25 s sample |
| 4–7 s | Scroll starts; header and bars scroll out of view (header is **not sticky**); hero controls appear: ‹ ● ● ● ● › ‖ (4th dot active) | Floating WhatsApp button stays fixed bottom-left |
| 6–10 s | "Trusted by Industry Leaders" logo strip; logos drift left between frames | Delhivery logo shows broken-image alt text |
| 9–19 s | "Shop by category": 6-column grid, 7 rows (41 tiles) | Rows near viewport bottom are semi-transparent → fade-in on scroll |
| ~19–21 s | "Let customers speak for us" review carousel (4 visible cards, arrows) | |
| 21–25 s | Dark section "Mini Assorted Packs" (5 columns × 2 rows, quantity steppers, View all) | |
| 25–28 s | White section "Power Tools" (6 columns, Sale pills, purple View all) | |
| 28–32 s | Dark section "Assorted Screw Packs" with "POPULAR PICKS" label (5×2) | |
| 32–34 s | White "New in Bearings" (4 text-link tiles) | |
| 34–36 s | Dark "Blog posts" (3 cards, View all) | |
| 36–37 s | White value-props row (4 purple icons) | |
| 37–39 s | Dark slate bulk/feedback form | |
| 39–42 s | Footer (About, Got Queries, subscribe, social, legal), "Install App" control bottom-left; idle | |

## New facts the video adds to the text-only analysis
1. There are **two** black announcement bars: one above the header (discount codes) and one below it (shipping/COD), each with ‹ › arrows.
2. The header has an **"Excl. Tax"** dropdown plus search, account and cart icons right of the nav; the nav wraps so "Join us" sits on a second line at this width.
3. The hero has a **control strip below the image** (prev, 4 dots, next, pause).
4. Category tiles mix **outline icons** (first 5) with product photos (rest).
5. Section backgrounds alternate **white / near-black (#111111)**; the form band is slate (#252433).
6. Mini Assorted Packs and Assorted Screw Packs each have **10** cards (earlier docs said 9 — corrected).
7. Header is not sticky at desktop width; WhatsApp button is fixed.

## Not covered by the video
Mega-menu open state, search, cart drawer/notification, hover states (product cards, tiles, nav), mobile/tablet layouts, keyboard focus, form validation, hero autoplay interval, slide-transition style, reduced motion. See [10](10-visual-difference-and-unknowns.md).
