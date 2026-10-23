# 12 — Visual Measurements from the Video

Confidence tags: **[MEASURED]** pixel-sampled/scanned from full-resolution frames; **[OBSERVED]** seen directly; **[ESTIMATED]** read from scaled frames, ±10%. Frame width 1920 px; page area ≈1900 px (scrollbar at right). Computed CSS was not available, so these are visual measurements, not source values.

## Colors
| Use | Value | Evidence |
|---|---|---|
| Announcement bars (both) | `#111111` | [MEASURED] |
| Header background | `#ffffff` | [MEASURED] |
| Hero slide background (neutral grey behind artwork) | `#e4e4e4` | [MEASURED] |
| Primary/brand purple ("Buy Now!" button) | ≈ `#6e0cf4` | [MEASURED] (button interior; antialias may shift ±2) |
| Purple reuse | "Screws" in logo, stars, review stars, View-all (white sections), Send button, value-prop icons, WhatsApp button, active slider dot is dark/black | [OBSERVED] |
| Dark section background (Mini Assorted Packs, Assorted Screw Packs, Blog) | `#111111` | [MEASURED] |
| Form band background | `#252433` | [MEASURED] |
| Form input fill | dark grey (≈ `#3a3a45`), lighter than band | [ESTIMATED] |
| Text on white | near-black | [OBSERVED] |
| Text on dark | white; excerpt/body text light grey | [OBSERVED] |
| Review meta ("3 months ago") | light grey italic | [OBSERVED] |

## Layout
| Item | Value | Evidence |
|---|---|---|
| Content container (header, grids) | left edge ≈ 199 px, right edge ≈ 1694–1710 px → **≈1500–1520 px wide**, centered with ≈200 px side margins at 1920 | [MEASURED] |
| Hero image | full-bleed (edge to edge) | [OBSERVED] |
| Hero height | ≈ 700 px at 1920 wide (≈ 2.7:1 banner) | [ESTIMATED] |
| Header height (white band) | ≈ 165 px (nav wraps to 2 lines) | [ESTIMATED] |
| Announcement bar height | ≈ 45–50 px each | [ESTIMATED] |
| Category grid | 6 columns, column pitch ≈ 254 px, 7 rows; last row has 5 | [MEASURED] pitch; [OBSERVED] rows |
| Category icon size | ≈ 110–120 px square; label ≈ 22–24 px, underlined; "Click here →" ≈ 14 px | [ESTIMATED] |
| Mini Assorted Packs / Assorted Screw Packs grid | 5 columns, card pitch ≈ 304 px, 10 cards (2 rows), image ≈ 295 px square | [MEASURED] pitch |
| Power Tools grid | 6 columns, pitch ≈ 254 px, 6 cards (1 row) | [MEASURED] |
| New in Bearings | 4 columns, pitch ≈ 380 px | [ESTIMATED] |
| Blog | 3 columns, pitch ≈ 508 px, image ≈ 500×300 (~5:3) | [ESTIMATED] |
| Value props | 4 centered columns, icon ≈ 90 px | [ESTIMATED] |
| Form column | ≈ 625 px wide, centered | [ESTIMATED] |
| Section heading size | ≈ 52–56 px, regular weight (dark sections: white, left-aligned) | [ESTIMATED] |
| Section vertical padding | ≈ 90–110 px top/bottom | [ESTIMATED] |

## Typography
| Item | Observation |
|---|---|
| Family | Humanist sans (resembles Assistant / Source Sans) for nav, headings, body; exact font [UNKNOWN] — check DevTools |
| Logo | Bold geometric wordmark "OnlyScrews"; "Only" black, "Screws" purple; custom artwork |
| Hero art text | Baked into images (outlined/filled purple display type) — not live text |
| Product titles | ≈ 15–16 px, regular, 2–4 lines, left aligned; price ≈ 15 px under it |
| Nav | ≈ 14–15 px, regular, no uppercase |
| Blog title | ≈ 28–30 px, medium weight, truncated with "…" after 2 lines; date ≈ 10 px uppercase bold |
| "POPULAR PICKS" | ≈ 14 px uppercase, bold, left aligned under section heading |

## Components
| Component | Visual spec [OBSERVED/ESTIMATED] |
|---|---|
| "Buy Now!" button | Solid purple, white text, square corners (radius ≈ 0–2 px), ≈ 175×62 px, centered near bottom of hero |
| "View all" (dark sections) | White fill, dark text, square, ≈ 155×40 px, centered |
| "View all" (white sections) | Purple fill, white text, square |
| Quantity stepper | 1 px light outline, square, − / 0 / + , ≈ 294×72 px px at full res (≈ card width) |
| "Sale" badge | Black pill, white text, bottom-left over product image |
| Form inputs | Square, dark fill on slate band, white labels with red asterisks; Send = full-width purple |
| Radios | Native-style, first option preselected |
| Subscribe field | Outlined input with arrow button inside right edge |
| Floating WhatsApp | ≈ 56 px circle, purple, white glyph, fixed bottom-left (~28 px from left, ~28 px from bottom) |
| "Install App" | Tiny outlined label under the WhatsApp button at page end |
| Icons | Header: line icons (search, user, bag). Category first 5: thick black outline icons; value props: filled purple |
| Cards | No visible border/shadow/radius on product cards; image area has dark/neutral panel |
| Dividers | Hairline above footer legal row |

## Header contents (left → right) [OBSERVED]
Logo · Home · Shop ▾ · Bulk/Custom Inquiry · Your Order ▾ · FAQs · Socials ▾ · About us · (wrap) Join us · "Excl. Tax" select · search · account · cart. Active item "Home" is underlined.
