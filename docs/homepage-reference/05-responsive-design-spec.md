# 05 — Responsive Design Specification

**Not inspected at any viewport.** Observed breakpoints: none. All values below are `[PROPOSED]` recommendations unless stated.

## Evidence
- Viewport meta `width=device-width,initial-scale=1` `[OBSERVED]`.
- Image `width` params (533 card / 1500 tile / 3200 category / 3840 hero) suggest responsive srcset on the source `[INFERRED]`.
- Navigation exists twice (drawer + header) → collapses on small screens `[INFERRED]`.

## Proposed breakpoints (recommendation only)
Mobile < 640px · Tablet 640–1023px · Desktop ≥ 1024px. Adjust to VERTEX's existing breakpoints once known.

## Component table
| Component | Desktop | Tablet | Mobile | Notes |
|---|---|---|---|---|
| Header | Full nav + icons `[UNKNOWN]` | UNKNOWN | Hamburger + drawer `[INFERRED]` | Touch targets ≥ 44px `[PROPOSED]` |
| Mega menu | 20 groups + 9 links — needs multi-column | UNKNOWN | Accordion drawer | Largest nav risk |
| Hero | Wide banner `[UNKNOWN]` | UNKNOWN | UNKNOWN | Capture crop/focal behavior; banners contain baked-in text |
| Category grid | 41 tiles; columns UNKNOWN | UNKNOWN | UNKNOWN | Propose 2–3 cols mobile; lazy-load images |
| Product rails | Cards per row UNKNOWN | UNKNOWN | UNKNOWN | Propose 4 / 3 / 2 |
| Reviews | UNKNOWN | UNKNOWN | UNKNOWN | |
| Blog | 3 posts, slider counter | UNKNOWN | UNKNOWN | |
| Forms | Single column likely | — | Full-width inputs | |
| Footer | UNKNOWN | UNKNOWN | UNKNOWN | |

## Constraints to enforce
No horizontal overflow; images use explicit aspect ratio to prevent layout shift; sticky/fixed elements must not cover content on small screens.

## Needed
Screenshots/recording at ~1440, ~820, ~390 px and DevTools media-query list.

## Update from video analysis
The recording is desktop only (≈1920 px). Desktop grid columns are in [12-video-visual-measurements.md](12-video-visual-measurements.md): categories 6, packs 5, power tools 6, bearings 4, blog 3, value props 4. Tablet/mobile remain unknown.
