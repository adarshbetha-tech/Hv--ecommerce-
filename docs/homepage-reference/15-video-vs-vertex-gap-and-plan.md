# 15 — Reference (video) vs Current VERTEX: Gap Analysis and Updated Plan

VERTEX facts are from [07](07-vertex-codebase-audit.md) (commit `b41f6fa`); reference facts from [11–14](11-video-analysis-overview-and-timeline.md). No code has been changed.

## Gap table
| Area | Reference (video) | VERTEX today | Gap | Action (proposed) |
|---|---|---|---|---|
| Palette | Purple `#6e0cf4`, black `#111111`, white, slate `#252433`, grey `#e4e4e4` | Navy/cyan/orange/emerald, light `#f8fafc` | Entirely different brand | **Owner decision** (Q1 in 10): keep VERTEX palette and copy layout, or adopt reference palette |
| Announcement | Two black bars with arrows | One top utility bar of 6 static items | Rotating messages + second bar | `AnnouncementBar` |
| Header | Logo, text nav, Excl.-Tax select, 3 icons; not sticky | Hamburger, brand, wide search bar, login/wishlist/cart buttons, 10-item nav bar; sticky | Different structure | Keep VERTEX header; add mega menu; decide sticky |
| Hero | Full-bleed image slider (4 slides) + control strip | Text hero + preview card, CSS entrance animation | New slider component and VERTEX artwork | `HeroSlider`, keep current hero as slide 1 fallback |
| Client logos | Marquee | Static "Featured Brands" tag strip | Marquee + licensing | Optional `TrustedBy` |
| Categories | 6-col image grid (41) | 3-col text cards (3 categories) | Image tiles; data volume | `CategoryTiles` over API data, image field needed |
| Reviews | Carousel with verified rating | None on home | No public review feed verified | Omit until data exists |
| Product rails | Dark/white alternating bands, 5–6 cols, stepper, Sale pill | Single "Featured Products" grid with tabs; card has SKU/spec chips/wishlist | Rail bands, compact card, stepper | `ProductRail` + `ProductCard variant="compact"` |
| Bearings tiles | 4 text-link tiles | — | New | `CollectionTiles` |
| Blog | 3 cards | — | No content source | Omit |
| Value props | 4 purple icons | 4 emoji cards (`vtx-values-bar`) | Style only | Restyle |
| Form | Slate band inline form | `QuoteModal` + bulk banner | Inline vs modal | Reuse modal or inline form |
| Footer | 2 text columns + subscribe + legal links | 4 columns, no legal links | Content/links | Extend |
| Floating contact | WhatsApp fixed | none | New | Optional |

## Updated implementation priority
1. **Decide palette (blocking).**
2. Baseline run (`npm test`, `npm run build`) — not yet done.
3. Extract home JSX from `App.jsx` into `src/components/Home/*` without behavior change.
4. `ProductRail` + compact card (largest visible win, data already available).
5. `CategoryTiles` (needs category images).
6. `HeroSlider` + `AnnouncementBar`.
7. Marquee, value props, form, footer polish.
8. Motion pass (reuse reveal) and responsive pass against existing breakpoints (960/840/640/500/380).

## Verification additions to [09](09-homepage-acceptance-test-checklist.md)
| ID | Requirement | Procedure | Expected | Priority |
|---|---|---|---|---|
| VID-01 | Container ≈ 1500 px centered at 1920 | Measure content extents vs [12](12-video-visual-measurements.md) | 1500–1520 px (if layout adopted) | P2 |
| VID-02 | Alternating light/dark bands in same order as [13](13-video-section-spec.md) | Visual compare | Matches or deviations logged | P2 |
| VID-03 | Rail columns: 5 (packs), 6 (power tools) at 1920 | Inspect grid | Matches | P2 |
| VID-04 | Hero controls: prev, 4 dots, next, pause below image | Interact | All work, keyboard-accessible | P1 |
| VID-05 | Marquee ≈ 70 px/s, pauses on hover/focus, off under reduced motion | Observe + OS setting | As stated | P3 |
| VID-06 | Category rows fade in once on scroll | Scroll | No repeat; no fade under reduced motion | P3 |

## Defects in reference observed in video (do not copy)
Delhivery logo renders as broken image/alt text; nav wraps to two lines at 1920; many product images are branded with the reference's own logo.
