# 09 — Homepage Acceptance Test Checklist

Verification status for all rows: **Not run** (nothing implemented yet). Priority: P1 critical, P2 important, P3 nice.

| ID | Requirement | Procedure | Expected result | Priority | Status |
|---|---|---|---|---|---|
| VIS-01 | Section order matches [01](01-homepage-section-inventory.md) (minus omitted sections) | Load `/` at 1440px and compare to reference screenshots | Same order; omissions documented in 10 | P1 | Not run |
| VIS-02 | Colors/type/spacing match captured tokens | Compare computed styles to [03](03-design-system.md) | Within agreed tolerance | P2 | Not run (tokens unknown) |
| VIS-03 | Screenshot diff reference vs VERTEX at 1440/820/390 | Capture both, overlay | Deltas logged in 10 | P2 | Not run |
| NAV-01 | Every nav item navigates or is intentionally disabled | Click each item and each mega-menu link | No dead clicks; URL `/products?category=…` valid | P1 | Not run |
| NAV-02 | Mobile drawer opens/closes (button, backdrop, Esc) and locks scroll | At 390px interact | Matches existing behavior | P1 | Not run |
| NAV-03 | Browser back/forward restores views | Navigate home → products → product → back | Correct view each step | P1 | Not run |
| LNK-01 | Category tile → catalogue with category filter | Click each tile | Filtered list loads | P1 | Not run |
| LNK-02 | Rail "View all" → catalogue filtered/sorted | Click | Correct list | P2 | Not run |
| LNK-03 | Product card → detail `/product/:slug` | Click image, title | Detail opens | P1 | Not run |
| SRCH-01 | Search submit filters featured products and scrolls | Enter query, submit; clear | Results/empty state/clear work | P1 | Not run |
| CART-01 | Add to cart (guest) updates badge, flash, badge bump | Click Add on a priced product | Count increments | P1 | Not run |
| CART-02 | Add to cart (logged-in) uses API | Login, add | Server cart updated | P1 | Not run |
| CART-03 | Quote-only products open `QuoteModal` | Click Request Quote | Modal opens | P2 | Not run |
| WISH-01 | Wishlist toggle on card updates header count | Toggle heart | Count/state sync | P2 | Not run |
| INT-01 | Hero controls: arrows, dots, swipe, pause-on-hover/focus | Interact at desktop/mobile | Works; keyboard accessible | P1 | Not run |
| INT-02 | Hover/focus states on cards, buttons, nav | Hover/tab through | Visible and consistent | P2 | Not run |
| INT-03 | Form validation (newsletter, quote) | Submit empty/invalid/valid | Errors then success state | P2 | Not run |
| ANI-01 | Reveal/stagger animations run once | Scroll page | Elements fade in, no repeat | P3 | Not run |
| ANI-02 | `prefers-reduced-motion: reduce` disables motion and autoplay | Enable OS setting | Content visible immediately, no autoplay | P1 | Not run |
| RES-01 | No horizontal overflow at 320–1920px | Resize | No horizontal scroll | P1 | Not run |
| RES-02 | Columns/cards per row follow [05](05-responsive-design-spec.md) | Check at each breakpoint | As specified | P2 | Not run |
| A11Y-01 | One `h1`, logical headings, landmarks, skip link | Inspect DOM / axe | No violations | P1 | Not run |
| A11Y-02 | Keyboard-only navigation incl. menu, slider, drawers | Tab/Shift+Tab/Esc | All operable, focus visible | P1 | Not run |
| A11Y-03 | Image alt text; touch targets ≥ 44px; contrast AA | axe + manual | Pass | P2 | Not run |
| LOAD-01 | Skeletons while loading categories/products | Throttle network | Skeletons shown | P2 | Not run |
| ERR-01 | API failure shows retry state; fallback data policy respected | Stop backend | Error/Retry or documented fallback | P2 | Not run |
| PERF-01 | Images lazy-loaded with intrinsic size (no CLS) | Lighthouse | Measured and recorded (do not assume) | P3 | Not run |
| CON-01 | No console errors/warnings on load and interactions | DevTools | None new | P1 | Not run |
| REG-01 | Existing tests pass | `npm test -- --watchAll=false`; `npm run build` | Same or better than baseline | P1 | Not run |
| REG-02 | Login, checkout, admin, product detail unaffected | Smoke each route | Unchanged behavior | P1 | Not run |
| CMP-01 | Reference-vs-VERTEX side-by-side review signed off | Review with owner | Approved | P2 | Not run |
