# 00 — Homepage Analysis Overview

## Objective
Document https://onlyscrews.in/ so its homepage can be recreated in the existing VERTEX E-Commerce project, preserving VERTEX's routing, auth, APIs and architecture. Documentation only; no implementation.

## Scope and exclusions
- In scope: homepage structure, content, links, product-card data, navigation.
- Out of scope: product, collection, cart, checkout, account pages; backend; Shopify theme internals.
- Not touched: VERTEX source, packages, DB, env vars.

## Methodology
| Step | Status |
|------|--------|
| Fetch homepage as markdown/text (WebFetch) | Done |
| Shell fetch (curl) | Failed: proxy returned HTTP 403 (CONNECT tunnel) |
| Rendered browser / screenshots | Not available (free plan; browser control not included) |
| Computed styles, JS/CSS inspection | Not possible with text fetch |
| Viewport testing (desktop/tablet/mobile) | Not possible |
| Hover/click/scroll testing | Not possible |
| VERTEX source inspection | Partial: repo `adarshbetha-tech/Hv--ecommerce-` (commit `b41f6fa`) cloned read-only; key files read, nothing run. See [07](07-vertex-codebase-audit.md) |

## Summary of the design [OBSERVED from content, not visuals]
OnlyScrews is a Shopify store [OBSERVED: `cdn/shop` asset paths, Shopify meta tags] selling fasteners, magnets, tools, bearings and related hardware in India. The homepage is a long, single-column vertical stack: 3-message announcement bar → header with large mega-menu → hero slideshow (4 banners) → client-logo strip → 41-tile category grid → customer reviews → four product rails (assorted packs, power tools, popular assorted packs, bearings collection) → blog (3 posts) → value-prop tiles → bulk-inquiry form → About/contact → newsletter → footer. See [01](01-homepage-section-inventory.md).

## Observed vs inferred
- Observed: section order, copy, 20+ nav groups, 41 category tiles, product titles/prices/sale badges, image URLs with width params (533/1500/3200), form fields, footer links.
- Inferred: slideshow/slider behavior (4 banners, "1 / of 3" blog counter text), cart notification drawer ("Item added to your cart" text), mobile drawer (duplicated nav markup).
- Unknown: everything visual (colors, type, spacing), motion, breakpoints.

## Key findings
1. Page is content-heavy; the category grid has 41 tiles using 3200px-wide images, a likely performance concern [INFERRED from `width=3200` URL param].
2. Nav markup appears twice (drawer + header) [OBSERVED].
3. Data inconsistencies on the reference: Magnets tile heading links to `/pages/neodymium-magnets` but its "Click here" goes to `/pages/magnets`; the WhatsApp banner shows one phone number while the link targets a different wa.me number; one product shows a compare-at price of ₹0.00. VERTEX should not copy these defects.
4. Some product cards show a "Sale" badge with struck-through compare-at price; others do not. No ratings, wishlist or quick-add controls were observed on cards (quantity text "Increase/Decrease quantity" appears on some cards).
5. Third-party client logos (Zomato Hyperpure, Philips, Zoho, etc.) are trademarks used with unknown permission.

## Known limitations
See [10](10-visual-difference-and-unknowns.md). Fidelity beyond structure cannot be promised.

## Implementation priorities
Structure/section order → header/mega-menu → hero → category grid → product rails → reviews/blog → forms/footer → motion → responsive polish.

## Related files
[README](README.md) · [01](01-homepage-section-inventory.md) · [02](02-component-inventory.md) · [03](03-design-system.md) · [04](04-animation-and-interaction-spec.md) · [05](05-responsive-design-spec.md) · [06](06-assets-and-media-inventory.md) · [07](07-vertex-codebase-audit.md) · [08](08-homepage-implementation-plan.md) · [09](09-homepage-acceptance-test-checklist.md) · [10](10-visual-difference-and-unknowns.md)
