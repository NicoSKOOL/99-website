---
name: seo-foundation
description: Use after astro-build, and again after any change to the site. Runs the technical SEO layer on the production build: titles, H1s, descriptions, canonicals, noindex mode, images, schema as a claims layer, internal links, robots.txt, sitemap.xml, llms.txt, _headers and _redirects. Fixes what fails and re-runs until every gate passes.
---

# SEO foundation

Scripts live in `<base>/../../scripts/`. Always check the BUILT site (`site/dist`), never the dev server, and never through WebFetch (it strips JSON-LD).

## Step 1: Build fresh
In `site/`: `npm run build`.

## Step 2: Run the gates
1. `node "<base>/../../scripts/verify-seo.mjs" sites/<slug>`
2. `node "<base>/../../scripts/validate-jsonld.mjs" sites/<slug>` (add `--allow-ratings` only if `business/proof.md` has real reviews)
3. `node "<base>/../../scripts/check-links.mjs" sites/<slug>`

## Step 3: Fix and repeat
Fix every FAIL in the content JSON or the templates (never by removing a page, section, image or link), rebuild, and re-run all three until all pass. Common fixes: move the keyword to the front of the title; shorten the description; add the missing link from home or the blog post; put the FAQ text on the page exactly as in schema.

Schema rules (the starter follows them; keep it that way):
- One `@graph` per page. LocalBusiness subtype only if the facts support it (`business.schema_type` in site.json, else LocalBusiness).
- Service per service page, BreadcrumbList on every non-home page, FAQPage only where the FAQ is visible, Article with author on blog posts.
- No rating or review nodes without real reviews. Telephone identical to client.md.

## Step 4: Rebuild mode
If `research/rebuild-redirects.csv` exists, `site/public/_redirects` must hold every 301 row (site-data writes it). Check with `cat site/public/_redirects`.

## Step 5: Report
Print: pages checked, gates passed, and the list of fixes made. Update project-state rows `astro-build` and `seo-foundation` to done.

## House rules
- No em dashes. Never add `noindex` to pass a check, never hide content, never drop a page.
