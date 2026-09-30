---
name: site-audit
description: Use after seo-foundation, before any deploy, or on any Astro site to get an honest score. Builds the production site, runs the three SEO gates and Lighthouse mobile (median of 3 per page template), and writes one prioritised fix list to audits/audit-<label>.md. Never changes the site.
---

# Site audit (the honest starting score)

Scripts live in `<base>/../../scripts/`. This skill only measures. Fixing is auto-fix.

## Step 1: Build fresh
In `sites/<slug>/site/`: `npm run build`. Never measure `npm run dev`.

## Step 2: Lighthouse
`node "<base>/../../scripts/lighthouse-gate.mjs" sites/<slug> --label <label>`
- `<label>`: `draft` for the first audit of a site, `pass-1`, `pass-2`... during auto-fix, `final` before deploy.
- Add `--all` before deploy (every page once is enough there: `--all --runs 1`).
- It takes about 40 seconds per page per run. Say so before starting.

## Step 3: One list
`node "<base>/../../scripts/audit-report.mjs" sites/<slug> --label <label>`

## Step 4: Report
Show the score table and the P1 items. Say plainly if everything passes. Never round a 98 up to 99 and never call a noindex SEO score "100" without the note the report prints.
Update project-state row `site-audit` with the label and the lowest score.
