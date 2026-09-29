---
name: astro-build
description: Use after site-images is approved. Writes the copy for every phase=now page on the approved site map as small JSON content files, in the business's own voice and facts, and builds the Astro site from the tested templates. Never adds, drops or renames pages.
---

# Astro build (templates, not pages)

Scripts live in `<base>/../../scripts/`.

## Step 0: Preflight
1. Checkpoints 2, 3 and images approved in `logs/approval-log.md`.
2. Re-run `node "<base>/../../scripts/site-data.mjs" sites/<slug>` so `site.json` matches the approved plan.
3. Read all of `business/` (including notes/), `research/site-map.csv`, `research/blog-plan.md`, `research/serp-notes.md` (PAA questions are FAQ material) and `design/image-slots.md`.

## Step 1: Write one content file per page
File: `site/src/content/pages/<id>.json`, id = `home` for `/`, otherwise the slug. Shape and required fields: see the starter's `src/lib/content.js` comment and the Stage 2 plan (url, h1, description, intro required; steps, price, faqs on services; service_link, author, date on blog posts; hero_image, hero_alt where a slot exists). Plain text only.

Page rules:
- 2-Second Rule above the fold: h1 + intro + trust line say what, the offer, where, and the next step.
- H1 contains the page's target keyword in natural words (a trailing state like "NC" may be dropped).
- Description 70 to 160 characters, includes the keyword, ends with the next step.
- Service pages: 950 to 1,300 words (sections + steps + FAQs). 5 or 6 sections covering what is included, options compared plainly, what drives the cost, local conditions, warranty and what to expect, care afterwards. Exactly 4 `steps`, each `{ name, text, image: "<slug>-step-N", image_alt }` and each describing what its process photo shows (the free estimate is not a step: it has its own panel). `related`: 2 or 3 sibling service slugs. Price signal from `services.md`, proof for THIS service (warranty, licence), 6 FAQs with buyer questions (cost, time, season, disruption). No founding story, no "What is X?" section, no byline or date, no conclusion paragraph.
- Area pages: which services they do in that town (link each), what is genuinely local (only facts you can state without inventing: distance from home base, which neighbourhoods). Never re-explain a service, never invent a local job or landmark claim.
- Hubs: one intro paragraph; the cards come from the template.
- Blog posts (`phase=now` only): follow `blog-plan.md`, answer the question in the first paragraph, use real prices from `services.md`, link to `service_link`, author = the owner named in `client.md`, date = today.
- About: the owner and how they work, only facts from `business/`. Contact: how estimates work, hours, phone, email, response time.
- Facts only from `business/`. Unknown = leave it out. Never-say list from `client.md` and `brand-voice.md`.
- Demo business: nothing extra in copy (the footer line is automatic).

## Step 2: Check the copy
`node "<base>/../../scripts/check-content.mjs" sites/<slug> --never "<comma list from the never-say rules>"`
Fix every ERROR and re-run until it passes. Read the WARN lines.

## Step 3: Build
In `site/`: `npm run build`. Fix any build error in the content or templates, never by deleting a page.

## Step 3b: Design pass (now that real copy and images exist)
The first Cedar & Stone build was called "VERY boring, looks AI-generated". The starter now carries the fixes; keep them and check:
1. `npx impeccable detect --json dist/` in `site/`. Act on real findings (a flat cream background everywhere, content flush against edges); some cramped-padding hits are heuristic, judge them by the screenshot.
2. The starter's page order is the baseline, keep it: home = hero, proof strip, money-maker tiles, photo band, testimonials, areas, split FAQ, estimate form. Service = hero, proof strip, copy + sticky AtAGlance, process band (photo per step), this service's testimonial, related services + areas, split FAQ, estimate form. Every "Get a free estimate" button jumps to the form on the same page (`#estimate`).
3. Screenshot the home and one service page at 1280px and look for: identical blocks repeated (the slim InlineCta after every second section, the form once at the end), empty tiles (every feature tile needs its image), dead space beside text (service pages use the AtAGlance panel), one background for every section (use a full-bleed photo band and a surface-coloured steps band).
4. Lighthouse after every design change (median of 3 on mobile). A change that costs points is fixed (lighter, smaller) or reverted, never kept.

## Step 4: Hand over to seo-foundation
Say: "Copy written for <n> pages, build passes. Next: /99-website:seo-foundation."

## House rules
- No em dashes. Fewer, truer words beat filler. Every page at least 50% unique vs its siblings (the checker enforces it).
