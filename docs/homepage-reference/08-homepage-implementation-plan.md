# 08 — Homepage Implementation Plan

Constraint: documentation only until approved. Based on verified VERTEX facts in [07](07-vertex-codebase-audit.md) and reference observations in [01](01-homepage-section-inventory.md). Visual specifics remain `[UNKNOWN]` until captured (see [10](10-visual-difference-and-unknowns.md)).

## Strategy
Keep CRA, the custom view-state routing, `App.jsx` handlers, `catalogApi.js`, cart/wishlist/auth and backend untouched. Extract the home view into small presentational components under `src/components/Home/`, fed by props from `App`, restyle with appended CSS using existing tokens. Reuse `ProductCard` (compact variant). No new dependencies.

## Component mapping
| Reference section | Proposed VERTEX component | Existing component to reuse | Required changes | Data source | Priority |
|---|---|---|---|---|---|
| Announcement bar (3 promos) | `Home/AnnouncementBar.jsx` | existing `.top-bar` markup | Replace static 6 items with configurable messages; optional rotation | Static config (VERTEX-owned offers only) | P2 |
| Header + nav + mega menu | keep `renderSharedHeader`; add `Home/MegaMenu.jsx` | existing header, nav bar, mobile drawer | Dropdown for category → subcategory tree; wire unhandled nav items | `getCategories()` (has `children`) | P1 |
| Hero slideshow | `Home/HeroSlider.jsx` | existing `.hero` section | Slides array; arrows/dots/swipe; keep current hero as slide 1 fallback | Static slides config (VERTEX assets) | P1 |
| Shipping/COD info strip | `Home/InfoStrip.jsx` | `.vtx-values-bar` | Copy changes only | Static config | P3 |
| Trusted by logos | `Home/TrustedBy.jsx` (optional) | `.brands-strip` | Only with licensed logos | Static config | P4 |
| Shop by category (image tiles) | `Home/CategoryTiles.jsx` | current `category-grid` block | Image tile layout; fall back to emoji/initial when no image | `getCategories()` | P1 |
| Product rails ×3 | `Home/ProductRail.jsx` | `ProductCard` | `variant="compact"`, "View all" → `handleNavigateCatalogWithCategory` | `getProducts({category, limit, sort})` | P1 |
| New-in collection tiles | `Home/CollectionTiles.jsx` | category tile component | Reuse tile | `getCategories()` subcategories | P3 |
| Reviews | `Home/ReviewsSection.jsx` | none | Needs review data; omit until real reviews exist (admin has `AdminReviews`; verify API) | UNKNOWN endpoint | P4 |
| Blog | omit unless VERTEX has content | none | — | none | P4 |
| Value props | existing `vtx-values-bar` | reuse | Copy only | Static | P3 |
| Bulk inquiry | existing bulk banner → `QuoteModal` | reuse | None | Existing | P3 |
| Newsletter | existing `.newsletter` | reuse | Currently local state only; backend newsletter endpoint not verified | Existing | P3 |
| Footer | existing `renderSharedFooter` | reuse | Optionally add policy links | Static | P2 |

## Dependency map
`App` (state, handlers) → `HeroSlider`, `CategoryTiles` (← `categories`), `ProductRail` (← `products`, `onAddToCart`, `onViewDetails`, `onRequestQuote`) → `ProductCard` (← `utils/wishlist`). `MegaMenu` ← `categories`, `handleNavigateCatalogWithCategory`. All data via `catalogApi` → `/api/*` or mock fallback.

## Data requirements
Per-category `imageUrl` (verify schema; else add seeded field in a separate approved change), product `price`/`mrp`/`tag`/`imageUrl` (already used by `ProductCard`). Never hardcode production prices/stock in components.

## Phases
| # | Phase | Work | Complexity |
|---|---|---|---|
| 1 | Baseline | Run `npm test`/`npm run build` on a clean checkout; screenshot current home | S |
| 2 | Tokens/global | Append reference-derived tokens only after capture; keep existing names | S |
| 3 | Header/nav | MegaMenu + handlers for dead nav items | M |
| 4 | Hero | `HeroSlider` with autoplay-pause, keyboard, swipe | M |
| 5 | Categories | Image tiles, skeletons, error/retry (reuse existing states) | M |
| 6 | Product rails | Extract `ProductRail`, compact card | M |
| 7 | Remaining sections | Info strip, value props, reviews/blog decisions | S–M |
| 8 | Footer | Links/copy | S |
| 9 | Motion | Reuse `.vtx-reveal`/stagger; add slider transition; honor reduced motion | S |
| 10 | Responsive | Align to existing 960/840/640/500/380 breakpoints | M |
| 11 | Regression | Run existing tests; add tests for new components | M |
| 12 | Visual diff | Compare against reference screenshots; log deltas in 10 | S |

## Risks and mitigation
| Risk | Mitigation |
|---|---|
| 2012-line `App.jsx` edits cause regressions | Extract one section per PR; run `App.test.js` after each |
| Only 3 categories vs 41 tiles | Render what the API returns; do not fabricate categories |
| Copyright/trademark of reference assets and text | Use VERTEX assets/copy only (see 06) |
| Fidelity unverifiable without captures | Block phases 2, 4, 9, 10 on screenshots + computed styles |
| Tests may already fail | Baseline in phase 1 before changes |
