# Homepage Reference Documentation Package

Reference site: https://onlyscrews.in/ (inspected 2026-10-21)
Target project: VERTEX E-Commerce, https://github.com/adarshbetha-tech/Hv--ecommerce- (commit b41f6fa; partially audited, see 07)

## Purpose
Evidence-based documentation so a developer or coding agent can recreate the reference homepage's layout and behavior in VERTEX without having seen the original conversation. **No code has been written or modified.**

## Evidence level (read first)
Inspection was done by a text/markdown page fetch only. There was no rendered browser, no screenshots, no computed CSS, no JS inspection and no viewport testing. Therefore:
- Section order, text structure, link destinations, prices and image URLs are **Observed**.
- Anything about colors, fonts, spacing, animation, breakpoints and hover behavior is **Unknown** unless labeled **Estimated** or **Proposed**.
- Tags used everywhere: `[OBSERVED]`, `[INFERRED]`, `[ESTIMATED]`, `[PROPOSED]`, `[UNKNOWN]`.

## Files and reading order
| # | File | Role |
|---|------|------|
| 1 | [00-homepage-analysis-overview.md](00-homepage-analysis-overview.md) | Objective, method, findings, limitations |
| 2 | [01-homepage-section-inventory.md](01-homepage-section-inventory.md) | Section-by-section inventory in page order |
| 3 | [02-component-inventory.md](02-component-inventory.md) | UI components and proposed VERTEX mapping |
| 4 | [03-design-system.md](03-design-system.md) | Tokens (mostly unknown) and proposed variables |
| 5 | [04-animation-and-interaction-spec.md](04-animation-and-interaction-spec.md) | Motion/interaction inventory with confidence |
| 6 | [05-responsive-design-spec.md](05-responsive-design-spec.md) | Responsive table; recommended breakpoints |
| 7 | [06-assets-and-media-inventory.md](06-assets-and-media-inventory.md) | Assets, licensing flags |
| 8 | [07-vertex-codebase-audit.md](07-vertex-codebase-audit.md) | Audit template; INCOMPLETE |
| 9 | [08-homepage-implementation-plan.md](08-homepage-implementation-plan.md) | Phased plan |
| 10 | [09-homepage-acceptance-test-checklist.md](09-homepage-acceptance-test-checklist.md) | Test cases |
| 11 | [10-visual-difference-and-unknowns.md](10-visual-difference-and-unknowns.md) | Gaps and questions for the user |

## How to use
1. Read 10 first to see what is not yet known.
2. Supply the missing evidence (screenshots/recording, VERTEX repo, DevTools computed styles).
3. Re-run inspection to upgrade `[UNKNOWN]`/`[ESTIMATED]` items, then complete 07.
4. Only then implement per 08 and verify per 09.

## Evidence to check before implementation
- Screenshots at ~1440, ~820, ~390 px widths for every section.
- DevTools computed styles (fonts, colors, spacing) and the theme's CSS/JS file list.
- Remaining VERTEX files not yet read (see 07 "Still unverified"), and a baseline `npm test` / `npm run build` run.
- Legal clearance for any reused imagery, logos and copy (see 06).

## Video-based addendum (screen recording of 2026-10-21)
Rendered-page evidence from the user's recording supersedes the "unknown" visual items in 03/04/05 where noted:
| File | Role |
|---|---|
| [11-video-analysis-overview-and-timeline.md](11-video-analysis-overview-and-timeline.md) | Recording facts, method, timeline, new findings |
| [12-video-visual-measurements.md](12-video-visual-measurements.md) | Measured colors, container, grids, components |
| [13-video-section-spec.md](13-video-section-spec.md) | Section-by-section visual spec with reproduce/verify notes |
| [14-video-animation-and-interaction-findings.md](14-video-animation-and-interaction-findings.md) | Observed motion with timing and confidence; gaps |
| [15-video-vs-vertex-gap-and-plan.md](15-video-vs-vertex-gap-and-plan.md) | Gap vs current VERTEX, updated priority, extra tests |
