# 13 — Section-by-Section Visual Spec (from video)

Companion to [01](01-homepage-section-inventory.md) (content/links) and [12](12-video-visual-measurements.md) (numbers). Each section lists: what is seen, how VERTEX should reproduce it, how to verify. Sizes are at 1920 px.

## S1 Top announcement bar
- Seen: full-width `#111111` bar, white centered one-line message (discount-code text), small chevrons at far left/right of the container.
- Reproduce: `AnnouncementBar` with `messages[]`, prev/next buttons, `aria-live="polite"`; VERTEX-owned offers only.
- Verify: bar height ≈ 45–50 px; chevrons keyboard-focusable; no layout shift when text changes.

## S2 Header
- Seen: white, logo left, text nav, "Excl. Tax" select, three line icons right; nav wraps to second line ("Join us") at 1920.
- Reproduce: extend existing `.header`/`.nav-bar`; allow nav to wrap or tighten gaps so it fits one line (improvement over reference).
- Verify: all nav targets function; tax select only if VERTEX needs tax display toggle (confirm with owner).
- Not sticky at desktop in the reference.

## S3 Second announcement bar
- Seen: identical black bar under the header (shipping/COD messages), own chevrons, swaps text.
- Reproduce: second `AnnouncementBar` instance or a single bar with grouped messages (owner decision).

## S4 Hero slider
- Seen: full-bleed `#e4e4e4` slide with full-image artwork and a centered purple "Buy Now!" at bottom; control strip below image on white: ‹, four dots (current dark), ›, pause (‖).
- Reproduce: `HeroSlider` with `slides[{src, alt, href, ctaLabel}]`, controls below, pause button toggling autoplay, `aria-roledescription="carousel"`.
- Verify: 4 slides; dot ↔ slide sync; pause stops autoplay; CTA keyboard reachable.
- Slide text is inside the image → provide real `alt`; VERTEX needs its own artwork.

## S5 Trusted by Industry Leaders
- Seen: centered bold heading ≈ 24 px; row of ~6 visible grayscale-ish logos continuously moving left (~70 px/s estimated); Delhivery logo broken.
- Reproduce: CSS marquee (translateX loop, duplicated list), paused on hover/focus and under reduced motion; only licensed logos.
- Verify: no jump at loop point; broken images have fallback.

## S6 Shop by category
- Seen: left-aligned large heading; 6×7 grid; each tile = image/icon, underlined name, "Click here →"; names up to 2–3 lines; tiles reveal with fade as they scroll in.
- Reproduce: `CategoryTiles` from `getCategories()` (VERTEX has 3 top-level + subcategories — render real data); tile = `<a>` with image, name, CTA text; reuse `.vtx-reveal`.
- Verify: grid 6 cols ≥ 1200 px; labels wrap without overlap; reveal skipped under reduced motion.

## S7 Reviews
- Seen: centered title, five purple stars + "from N reviews" underlined with green verified tick; four review cards in a row with side arrows; each card: stars, bold title, 2–3 lines clipped, author, "3 months ago", product thumbnail + underlined product link.
- Reproduce: only if VERTEX has real review data (admin has a reviews screen; public endpoint unverified). Otherwise omit.
- Verify: truncated text has accessible full text; arrows operable.

## S8 Mini Assorted Packs (dark)
- Seen: `#111111` band; large white heading; 5-col grid; dark image panel; title, price; outlined − 0 + stepper under each; centered white "View all".
- Reproduce: `ProductRail variant="dark"` + `ProductCard variant="compact"` with quantity stepper bound to existing `handleAddToCart(product, variant, qty)`.
- Verify: stepper does not add to cart until intended action (reference behavior on press is unobserved — confirm).

## S9 Power Tools (white)
- Seen: heading left; 6 cards with product photo; black "Sale" pill on discounted items; long titles; price (struck compare-at on sale per text fetch); purple "View all".
- Reproduce: same rail, light variant; sale pill from `mrp > price` or `tag`.
- Verify: pill visible only on discounted items.

## S10 Assorted Screw Packs (dark)
- Seen: heading + "POPULAR PICKS" label; 5×2 cards; same stepper pattern; White "View all".
- Note: first two images are branded kit shots; others dark-background pack photos.

## S11 New in Bearings (white)
- Seen: heading; 4 columns; cutout product image on white; label with arrow ("LM Series →"); no price.
- Reproduce: `CollectionTiles` → `handleNavigateCatalogWithCategory`.

## S12 Blog posts (dark)
- Seen: bold white heading; 3 cards: ~5:3 purple branded image, white title (2 lines + "…"), tiny uppercase date, grey 4-line excerpt; centered "View all".
- Reproduce: omit unless VERTEX has content; if built, use a `posts[]` source.

## S13 Value props (white)
- Seen: four centered purple filled icons with bold labels (Best price, No MOQ, Fast Shipping, Best Quality).
- Reproduce: existing `.vtx-values-bar` restyled; VERTEX-specific claims only.

## S14 Bulk/feedback form (slate)
- Seen: centered white bold heading + subtext; radio "General feedback / Bulk order inquiry"; Name*, Email*, Phone (optional), Message*; full-width purple Send.
- Reproduce: either reuse `QuoteModal` or inline form posting to a VERTEX endpoint (quote endpoint unverified in audit).
- Verify: required validation, success/error states (unobserved in reference).

## S15 Footer
- Seen: white; large wordmark left; "About Us" paragraph with bold phrases; "Got Queries?" column with email/phone; "Subscribe to our emails" outlined input with arrow; Facebook/Instagram icons; legal links line (6 links); small analytics notice bar; "Install App" label.
- Reproduce: extend `renderSharedFooter`; VERTEX copy/contacts.

## Global: floating WhatsApp button
- Seen: fixed bottom-left circle visible through whole scroll.
- Reproduce: optional `FloatingContact` using VERTEX's real support number.
