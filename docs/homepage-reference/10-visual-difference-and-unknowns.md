# 10 — Visual Differences and Unknowns

## Could not be inspected
| Area | Why |
|---|---|
| Rendered appearance, screenshots | No browser access (shell blocked by proxy 403; browser control not on this plan). Only a text/markdown fetch of the page worked. |
| Computed styles, fonts, colors, spacing | Needs DevTools |
| Theme CSS/JS, libraries, animation implementation | Not retrievable; platform is Shopify (observed), theme name unknown |
| Hover, click, focus, scroll, autoplay behavior | Not testable |
| Tablet/mobile layouts and breakpoints | Not testable |
| Cart notification, overlays, consent/notification popups | Text only |
| Reduced-motion behavior | Not testable |
| VERTEX: `App.css` body, `Products.css`, other components, schema, serializers, test/build results | Not read/run (see [07](07-vertex-codebase-audit.md)) |

## Uncertain (do not treat as fact)
Slider/rotation behavior of announcement bar, hero and blog; whether the category block is a grid or carousel; hover image swap on two-image cards; sticky header; mega-menu layout; cards per row.

## Known visual differences VERTEX will have today
- Reference: image-led 41-tile category grid; VERTEX: 3 text/emoji category cards (data-limited).
- Reference: hero slideshow of full-width banners; VERTEX: single text hero with preview card.
- Reference: no wishlist/spec chips/SKU on cards; VERTEX cards carry them (keep; compact variant proposed).
- Reference: reviews, blog, client logos, assorted-pack rails; VERTEX has none of these.
- Reference header: one-level mega menu of 20+ groups; VERTEX: 10-item flat nav.

## Reference defects not to copy
Magnets tile heading/link mismatch; displayed vs linked WhatsApp number mismatch; ₹0.00 compare-at price on one card; duplicated nav markup.

## Assumptions
1. "Reproduce as closely as legally possible" means layout/structure/behavior only, not the reference's images, logos, copy or customer reviews.
2. VERTEX keeps its own branding/palette per `AGENTS.md` unless the owner says otherwise.
3. Category/product data comes from VERTEX's API, so tile and card counts follow VERTEX data.

## Questions for you
1. Should VERTEX adopt the reference's colors/typography, or keep the navy/orange/cyan VERTEX palette and only copy layout?
2. Which reference sections do you want (reviews, blog, client logos, assorted-pack rails) given VERTEX has no such content yet?
3. Can category records get image URLs (needs a schema/seed change)?
4. Is the bulk-inquiry form meant to reuse `QuoteModal`?
5. Fidelity target: exact visual match or structural match?

## Evidence needed
- Screenshots (full-page) at ~1440, ~820, ~390 px, plus mega-menu open, mobile drawer open, a product card hover.
- Screen recording of load + scroll + hero interaction.
- DevTools exports: computed styles for header, hero, tile, card, button; list of CSS/JS files; `@media` rules.
- Confirmation of owner/permission for any reference imagery you want to reuse.

## Update after video analysis
Resolved by the recording: rendered layout, section backgrounds, desktop grid columns, brand colors, announcement/hero control structure, scroll fade-ins, marquee, non-sticky header (see 11–15). Still unresolved: mega-menu, hover states, search, cart notification, mobile/tablet, hero autoplay interval and transition, fonts, form feedback. A second recording list is in [14](14-video-animation-and-interaction-findings.md).
