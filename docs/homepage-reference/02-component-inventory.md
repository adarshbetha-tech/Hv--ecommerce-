# 02 — Component Inventory

Reference observations from text only. The "Existing VERTEX file" column below was written before the repo was read; the **verified** mapping is in [07](07-vertex-codebase-audit.md) and [08](08-homepage-implementation-plan.md) and takes precedence. Verified existing files include: `src/App.jsx` (header, nav, mobile drawer, home sections, footer inline), `src/components/Products/ProductCard.jsx`, `src/components/Cart/CartDrawer.jsx`, `src/components/Products/WishlistDrawer.jsx`, `src/components/Products/QuoteModal.jsx`.

| Reference component | Responsibility | Inputs | Reusable? | Proposed VERTEX component | Existing VERTEX file | Priority |
|---|---|---|---|---|---|---|
| SkipLink | Jump to main | target id | Yes | `SkipLink` | UNKNOWN | P1 |
| AnnouncementBar | Show 3 promo messages | string[] | Yes | `AnnouncementBar` | UNKNOWN | P2 |
| Header | Logo, nav, search, account, cart | nav tree, cart count, user | Yes | `SiteHeader` | UNKNOWN | P1 |
| MegaMenu / NavDrawer | Grouped category navigation (20 groups + 9 links) | category tree | Yes | `MegaMenu`, `MobileNavDrawer` | UNKNOWN | P1 |
| SearchBox | Search entry | query | Yes | `SearchBox` | UNKNOWN | P1 |
| CartIcon + badge | Link to cart, count `[UNKNOWN]` | count | Yes | `CartIcon` | UNKNOWN | P1 |
| CartNotification | "Item added" with View cart / Checkout / Continue | last added item | Yes | `CartToast`/`MiniCart` | UNKNOWN | P2 |
| InfoStrip | COD / free shipping text | strings | Section-specific | `ShippingInfoStrip` | UNKNOWN | P3 |
| HeroSlider | 4 linked banners | slides[{image, href, alt}] | Yes | `HeroSlider` | UNKNOWN | P1 |
| LogoStrip | Client logos | logos[] | Section-specific | `TrustedBy` | UNKNOWN | P3 (licensing) |
| CategoryTile / CategoryGrid | Image + name + link, 41 items | categories[] | Yes | `CategoryGrid` | UNKNOWN | P1 |
| ReviewCard / ReviewsSection | Title, body, author, date, product link | reviews[], total count | Yes | `ReviewsSection` | UNKNOWN | P3 |
| ProductCard | Image(s), title, price, compare-at, sale badge, unit price | product | Yes | `ProductCard` | UNKNOWN | P1 |
| ProductRail | Heading + cards + "View all" | products[], href | Yes | `ProductRail` | UNKNOWN | P1 |
| CollectionTile | Image + title (no price) | collection | Yes | `CollectionTileRail` | UNKNOWN | P2 |
| BlogCard / BlogRail | Image, title, date, excerpt | posts[] | Yes | `BlogRail` | UNKNOWN | P3 |
| ValueProps | 4 image tiles | items[] | Section-specific | `ValueProps` | UNKNOWN | P3 |
| InquiryForm | Typed inquiry form | submit handler | Yes | `InquiryForm` | UNKNOWN | P3 |
| AboutBlock / ContactBlock | Brand text, contact | strings | Section-specific | `AboutSection` | UNKNOWN | P3 |
| NewsletterForm | Email capture | email | Yes | `NewsletterForm` | UNKNOWN | P3 |
| SiteFooter | Socials, copyright, policy links | links | Yes | `SiteFooter` | UNKNOWN | P2 |
| ConsentNotice / InstallApp / NotificationChannels | Overlays (third-party/Shopify apps) | n/a | No — do not replicate by default | none | n/a | P4 |

## Hierarchy
```
HomePage
├─ SkipLink
├─ AnnouncementBar
├─ SiteHeader ── SearchBox, CartIcon, MegaMenu / MobileNavDrawer
├─ CartToast (global)
├─ ShippingInfoStrip
├─ <main id="MainContent">
│   ├─ HeroSlider
│   ├─ TrustedBy
│   ├─ CategoryGrid ── CategoryTile ×N
│   ├─ ReviewsSection ── ReviewCard ×N
│   ├─ ProductRail ×3 ── ProductCard ×N
│   ├─ CollectionTileRail
│   ├─ BlogRail ── BlogCard ×N
│   ├─ ValueProps
│   ├─ InquiryForm
│   └─ AboutSection (+contact)
├─ NewsletterForm
└─ SiteFooter
```

## Notes
- Reuse one `ProductCard` for all three rails; the only variation observed is an optional second image and optional sale badge.
- Cart/auth behavior must call VERTEX's existing services (to be identified in 07).
