# Changelog

## Unreleased (2026-11-15)

Added Google's Modern Web Guidance 1.0 (https://developer.chrome.com/blog/modern-web-guidance-v1), the expert-checked, Baseline-aware web platform skills now backed by Chrome, Firefox and Edge.

- **setup-check / doctor.mjs**: new `web_guidance` check (WARN, not a blocker) with the install fix.
- **site-design**: Step 4a, look up each interactive piece (menu, FAQ, form, hero image) in Modern Web Guidance before building it; native HTML/CSS over JS widgets; a written browser support policy (Baseline Widely available, newer features only with feature detection, no polyfills); `prefers-reduced-motion`.
- **astro-build**: Step 3c modern web pass, `legacy-scan` on `site/src`, verify, fix in templates, Lighthouse must not drop.
- **site-audit**: legacy-scan findings added to the audit as P2 "Modern web" items (measure only).
- **auto-fix**: Core Web Vitals and accessibility fixes are looked up in Modern Web Guidance instead of guessed; long tasks under 50 ms.

## 0.1.0 (2026-09-29, Stage 1)

Tested end to end on two sites: a real rebuild (myinclusion.com.au, NDIS, Australia) and a fictional new build (Cedar & Stone Landscapes, Charlotte NC).

- **setup-check**: local checks (Node, Cloudflare login, Lighthouse, Chrome, keys, design skills) plus DataWise, DataForSEO, fal and treg connection checks. Picks the keyword data path (DataWise, DataForSEO or manual) and saves `.99-website/setup.json`.
- **business-intake**: new build (one-question-at-a-time interview) or rebuild (crawl the old site, pull Search Console through DataWise, ask only the gaps in one list). Treats old site copy and notes as claims, flags testimonials, ratings and years claims, sensitive-niche rules (NDIS), demo-business mode. Ends at Checkpoint 1.
- **keyword-sitemap**: seeds from services and GSC queries, DataWise `suggestions` + metrics, live SERP reads, a 4-part publication gate, one keyword per page, rebuilds keep URLs that already rank, blog plan, redirect map. Ends at Checkpoint 2.
- Scripts (zero dependencies, `node:test`): `doctor.mjs`, `site-init.mjs`, `confirm-count.mjs`, `crawl.mjs`, `validate-sitemap.mjs` (with `--crawl` for rebuilds), `validate-redirects.mjs`, `lib/csv.mjs`.
