# 07 — VERTEX Codebase Audit

Repo: https://github.com/adarshbetha-tech/Hv--ecommerce-  ·  Inspected: shallow clone, commit `b41f6fa` ("Merge GitHub changes and update product catalogue"), read-only on 2026-10-21.
**Status: PARTIAL.** Verified by reading `package.json`, `AGENTS.md`, `SETUP.md`, `.env.example`, all of `src/App.jsx` (2012 lines), `ProductCard.jsx`, `catalogApi.js`, `mockConfig.js`, `index.css`, and token/breakpoint/animation rules in `src/App.css`. NOT read in full: `App.css` body, `Products.css`, `ProductListPage`, `ProductDetailPage`, `CartDrawer`, `WishlistDrawer`, `QuoteModal`, `mockData.js`, `guestCart.js`, `wishlist.js`, server code, tests. Nothing was run (no install, build or tests).

## Verified architecture
| Item | Finding | Evidence |
|---|---|---|
| Framework | React ^19.3.0, react-dom ^19.3.0 | `package.json` |
| Build tool | Create React App (`react-scripts` 5.0.1) | `package.json` scripts |
| Language | JavaScript (JSX), no TypeScript observed | file extensions |
| Routing | **No router library.** Custom state: `currentView` + `window.location.pathname` + `history.pushState`/`popstate` inside `App()` | `src/App.jsx` lines 143–166, 279–307, 440–466 |
| Views | `home`, `products` (`/products`, `/catalog`), `product-detail` (`/product/:slug`), `login`, `checkout`, `admin` (`/admin/*`) | `src/App.jsx` |
| Styling | Plain CSS: `src/App.css` (2743 lines), `src/components/Products/Products.css` (1903), per-feature CSS. No Tailwind/Sass/modules observed. | file list |
| Icons | Emoji characters; no icon library dependency | `package.json`, `App.jsx` |
| Animation | Pure CSS + `IntersectionObserver` reveal (`.vtx-reveal`, `.is-revealed`, `.vtx-stagger-1..4`), `@keyframes` (`heroFadeRise`, `heroShowcaseFloat`, `cartBadgePop`, skeleton pulse, modals, drawer). No animation library. | `App.jsx` 392–438, `App.css` |
| Reduced motion | Global `@media (prefers-reduced-motion: reduce)` plus observer skipped when it matches | `App.css` 94–123, `App.jsx` 398–403 |
| Backend | Express + Prisma (`server/`), controllers/services/routes/validators/middleware split; tests in `server/tests` | file list |
| Data access | `src/services/catalogApi.js` → `${REACT_APP_API_URL \|\| http://localhost:5000}/api/categories`, `/api/products`, `/api/products/:slug`; falls back to `src/mock/mockCatalogApi.js` if offline; mock mode never active in production builds | `catalogApi.js`, `mockConfig.js` |
| Auth | HttpOnly-cookie session via `authApi.getCurrentUser`; guest cart in browser merged on login (`mergeGuestCart`) | `App.jsx` 261–277, 483–542 |
| Cart / wishlist | App-level state; `addItemToCart` (authed) or `addGuestItem` (guest); wishlist via `utils/wishlist.js` + `vertex_wishlist_updated` window event | `App.jsx`, `ProductCard.jsx` |
| Tests | Jest/RTL via CRA: `App.test.js`, `ProductListPage.test.js`, `CartDrawer.test.js`, etc.; lint = `react-app` config | file list, `package.json` |
| Project rules | `AGENTS.md`: preserve VERTEX branding/palette/layout, no framework swap, small reviewable changes, never trust browser prices, report only verified results | `AGENTS.md` |

## Current homepage (view `home`, `src/App.jsx` ~1449–1903)
Order today: flash banner → top utility bar (6 items) → header (hamburger, brand, search form, login, wishlist, cart) → 10-item nav bar (+ mobile drawer) → hero (copy left, Arduino preview card right) → 4 value cards → "Shop by Category" (`category-grid`, 3 columns, text cards with emoji icon from API categories) → "Featured Products" (filter tabs + `product-grid` of `ProductCard`, limit 12) → fastener/nut type reference lists → bulk-orders banner → newsletter → featured-brands strip → shared footer → modals/drawers.

## Existing design tokens (`App.css` `:root`, verified)
Navy `#09182d`/`#06101f`/`#162a4a`; cyan `#0ea5e9`; emerald `#10b981`; orange `#f97316`/`#ea580c`; bg `#f8fafc`; surface `#fff`; border `#e2e8f0`; text `#0f172a`/`#475569`/`#64748b`/`#94a3b8`; font stack system-ui (no webfont); radii 6/10/14/full; shadows sm–lg; spacing 4–48px; transitions 0.15s / 0.25s cubic-bezier(0.16,1,0.3,1). Container max-width 1280px. Existing responsive breakpoints: 960, 840, 640, 500, 380 px.

## Source-evidence table
| File path | Component/function | Existing responsibility | Homepage relevance | Action | Reason |
|---|---|---|---|---|---|
| `src/App.jsx` | `App`, `renderSharedHeader`, home JSX | Routing, state, header/footer, home sections (2012 lines, monolithic) | Entry point for the homepage | **Modify minimally** (swap home JSX for extracted components); do not touch routing/auth/cart handlers | Single file owns everything; extraction keeps diffs reviewable |
| `src/components/Products/ProductCard.jsx` | `ProductCard` | Card with wishlist, tag, drive pill, SKU, spec chips, price/MRP, stock, Specs/Add to Cart/RFQ | Reference's rails use a simpler card (title, price, struck compare-at, "Sale") | **Reuse**; add a lean `variant="compact"` prop rather than a new card | Preserves wishlist/cart/RFQ behavior |
| `src/services/catalogApi.js` | `getCategories`, `getProducts`, `getProductBySlug` | Live API with mock fallback | Data source for category grid and rails | **Reuse unchanged** | Supports `category`, `sort`, `limit`, `q` params |
| `src/components/Cart/CartDrawer.jsx` | `CartDrawer` | Cart UI | Reference has "Item added" notification | **Leave**; reuse flash banner / badge bump | Already has `cartBadgePop` and flash message |
| `src/components/Products/WishlistDrawer.jsx`, `utils/wishlist.js` | wishlist | Wishlist UI/state | Not on reference homepage | **Leave unchanged** | Preserve VERTEX feature |
| `src/components/Products/QuoteModal.jsx` | `QuoteModal` | RFQ modal | Equivalent of reference "Bulk/Custom Inquiry" form | **Reuse** (open from the bulk section) | Avoid duplicate form |
| `src/App.css` | tokens, hero, `.category-grid`, `.product-grid`, reveal, breakpoints | Global styling | Add new classes here or in a new CSS file | **Modify (append)**; do not rename existing classes | Avoid regressions in other views |
| `src/mock/mockData.js`, `mockCatalogApi.js` | seed catalogue (2 118 lines) | Dev/offline data | Only 3 top-level categories exist (electronics, fasteners, nuts) | **Leave**; extend seed only if more categories are required | Reference has 41 category tiles |
| `src/assets/logo.png`, `assets/hardware/*` | logo, 4 JPGs, 12 SVGs | Brand and product visuals | Hero/category imagery | **Reuse** | Owned assets; avoids copying reference imagery |
| `server/**`, `server/prisma/**`, `.env*` | Backend, DB | Out of scope | — | **Do not change** | Task is frontend homepage only |

## Gaps / risks found
1. `App.jsx` is one 2012-line component; home sections are inline JSX — extract before restyling.
2. No router; the reference's ~60 link destinations map onto `/products?category=&subcat=` only (3 categories + subcategories exist). Needs category data decisions.
3. Category tiles today are text/emoji cards, not image tiles; category records have no `imageUrl` field verified (check `catalogSerializer.js` / schema).
4. No webfont; reference font is unknown, so keep system stack.
5. Nav items "Brands, Resources, About, Contact" have no handler in `handleNavClick` (only Home/Products/Electronics/Screws/Nuts/Offers act).
6. Footer links "Pan-India Shipping Policy" and "GST Tax Invoicing" are no-op buttons.

## Still unverified
`App.css` hero/nav/footer details, `Products.css`, `schema.prisma` category/product fields (image URLs, compare-at price field name `mrp`, tags), `catalogSerializer.js`, test status (`npm test`/`npm run build` not run).
