# 01 — Homepage Section Inventory

All entries `[OBSERVED]` from text content unless tagged. Dimensions, spacing and visual treatment are `[UNKNOWN]` (no render). No screenshots exist; none are referenced.

## Section order
| # | Section | Key content |
|---|---------|-------------|
| 0 | Skip link | "Skip to content" → `#MainContent` |
| 1 | Announcement bar | 3 discount-code messages (5% above ₹849, 10% above ₹1599, 15% above ₹2999). Rotation/stacking [UNKNOWN] |
| 2 | Header + nav | Logo/h1 "OnlyScrews", nav, search, log in, cart, Facebook/Instagram icons |
| 3 | Cart notification | "Item added to your cart", View cart, Checkout, Continue shopping |
| 4 | Info strip | COD available on orders ₹450–₹800; free standard shipping above ₹799 |
| 5 | Hero slideshow | 4 banner images (see below) |
| 6 | Trusted by Industry Leaders | 12 client logos |
| 7 | Shop by category | 41 tiles, each image + h3 link + "Click here" |
| 8 | Reviews | "Let customers speak for us", "from 1208 reviews", 15 review entries |
| 9 | Mini Assorted Packs | 10 product cards + View all (corrected from video) |
| 10 | Power Tools | 6 product cards + View all |
| 11 | Assorted Screw Packs ("Popular Picks") | 10 cards, each with 2 images in source markup + View all (corrected from video) |
| 12 | New in Bearings | 4 collection tiles (no price) |
| 13 | Blog posts | 3 posts, "1 / of 3" counter, View all |
| 14 | Value props | 4 image tiles: Best price, No MOQ, Fast Shipping, Best Quality |
| 15 | Bulk orders / feedback form | Inquiry type, name, email, phone (optional), message, Send |
| 16 | About Us | Image, mission paragraph, tagline |
| 17 | Got Queries | Support email, phone, "Chennai" line |
| 18 | Newsletter | "Subscribe to our emails", email field |
| 19 | Footer | Social icons, copyright, 6 policy links |
| 20 | Overlays | Analytics/consent notice, "Install App", notification-channels form (email, country code, phone) |

## Section details

### 2. Header / navigation
- Top-level: Home; **Shop** (mega/drawer); Bulk/Custom Inquiry; Your Order (Order History, Track your Order [external Netlify app], GST Invoice); FAQs; Socials (Reddit, Instagram, WhatsApp Community); About us; Join us (Google Form).
- Shop has 20 grouped categories with children (Screws & Bolts 13 items, Nuts 15, Magnets 11, Tools 12, Power Tools 5, Lug Connectors 10, Abrasives 5, Drill Bits and Taps 5, Knob Screws 5, Glues/Lubes/Sealants 3, Safety 6, Ball Bearings 3, Linear Bearings 3, Zip Ties 2, Circlips 3, Dowel Pins 3, Paint Brushes 3, Carbide Inserts 3, Clamps 2) plus 9 single links (Tapes, Storage Boxes, Springs, Aluminium Extrusion Profile, Cotter Pins, Spray Paints, Couplers & Fittings, Smooth Rods, Castor Wheels).
- Nav markup appears twice (drawer and header) `[OBSERVED]`; mobile hamburger `[INFERRED]`.
- Search control present (label "Search"); suggestions `[UNKNOWN]`.
- Cart link present; cart count badge `[UNKNOWN]`. Wishlist: not observed.
- Sticky behavior `[UNKNOWN]`.

### 5. Hero slideshow
1. Banner → "Buy Now!" → `/collections/brass-inserts-1`
2. Banner → link text "💬 / 📞 on <phone>" → wa.me link (displayed and linked numbers differ — flag)
3. Banner → "Buy Now!" → `/pages/magnets`
4. Banner → "Buy Now!" → `/collections/tools`
Images are text-free in markup; banner copy is baked into images `[INFERRED from filenames]`. Height, autoplay, arrows, dots `[UNKNOWN]`.

### 7. Shop by category (41 tiles, in order)
Flat (Slotted), Cross (Phillips), Hex (Allen), Combination, Bolts, Magnets, Spacers, Brass Inserts, Nuts, Washers, Eye Bolt, Grub Screws, OnlyTools, Power Tools, Abrasives, Storage Boxes, Glues Lubes & Sealants, Tapes, Safety Equipment, Cable Zip Ties, OnlyBearings, Linear Bearings, Aluminium Profiles, Drill Bits and Taps, Carbide Inserts, Dowel Pins, Smooth Rods, Springs, Knob Screw, Lug Connectors, Cotter Pins, Spray Paints, Paint Brushes, Couplers & Fittings, Circlips, Hose Clamps, Clamps, Helicoils, Rivets, Castor Wheels, Roofing Screws.
Grid vs carousel `[UNKNOWN]`.

### 8. Reviews
Each entry: title, body, reviewer name, date (MM/DD/YYYY), linked product. Layout (slider/grid) `[UNKNOWN]`. Content is third-party customer text; VERTEX must use its own reviews.

### 9–11. Product rails
Card contents observed: image, title (linked, appears twice in markup), "Regular price", optional "Sale" text + struck compare-at price, "Unit price / per", quantity increase/decrease labels on some cards. Not observed: ratings, wishlist, quick view, add-to-cart button text (may be hidden), stock indicators, color/size selectors.
- Mini Assorted Packs prices ₹230–₹1,210; no sale.
- Power Tools prices ₹2,400–₹6,000; 4 of 6 on sale (e.g. ₹4,600 vs ₹10,200).
- Assorted Screw Packs prices ₹790–₹2,000; two images per card (hover swap `[UNKNOWN]`); one card has a ₹0.00 compare-at (source data bug).

### 12. New in Bearings
LM Series, SBR Series, SBR L Series, Pillow Block Insert Bearing; images requested at width 1500.

### 13. Blog
Posts dated Oct 18–20 2026, titles truncated with ellipsis in markup, excerpt text, "View all" → `/blogs/hardwareguide`. Slider counter text implies a carousel `[INFERRED]`.

### 15. Bulk form
Fields: Type of inquiry* (General feedback / Bulk order inquiry), Name*, Email*, Phone (optional), Message*, Send. Validation/submit feedback `[UNKNOWN]`.

## Desktop vs mobile
`[UNKNOWN]` — not inspected. See [05](05-responsive-design-spec.md).
