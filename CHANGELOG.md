# Changelog

## 0.1.0 (2026-09-29, Stage 1)

Tested end to end on two sites: a real rebuild (myinclusion.com.au, NDIS, Australia) and a fictional new build (Cedar & Stone Landscapes, Charlotte NC).

- **setup-check**: local checks (Node, Cloudflare login, Lighthouse, Chrome, keys, design skills) plus DataWise, DataForSEO, fal and treg connection checks. Picks the keyword data path (DataWise, DataForSEO or manual) and saves `.99-website/setup.json`.
- **business-intake**: new build (one-question-at-a-time interview) or rebuild (crawl the old site, pull Search Console through DataWise, ask only the gaps in one list). Treats old site copy and notes as claims, flags testimonials, ratings and years claims, sensitive-niche rules (NDIS), demo-business mode. Ends at Checkpoint 1.
- **keyword-sitemap**: seeds from services and GSC queries, DataWise `suggestions` + metrics, live SERP reads, a 4-part publication gate, one keyword per page, rebuilds keep URLs that already rank, blog plan, redirect map. Ends at Checkpoint 2.
- Scripts (zero dependencies, `node:test`): `doctor.mjs`, `site-init.mjs`, `confirm-count.mjs`, `crawl.mjs`, `validate-sitemap.mjs` (with `--crawl` for rebuilds), `validate-redirects.mjs`, `lib/csv.mjs`.
