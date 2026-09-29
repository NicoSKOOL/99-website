---
name: site-design
description: Use after the page plan is approved (Checkpoint 2) and before any page is written. Picks one visual system for the site with taste-skill (direction) and Impeccable (shape), under 99-website overrides for a static Astro site that must score 99 on Lighthouse. Writes design/style.md and the Tailwind tokens, then renders the home page top section for Checkpoint 3.
---

# Site design (one visual system before any page exists)

Scripts live in `<base>/../../scripts/` (`<base>` = the "Base directory for this skill" shown above).

## Step 0: Preflight
1. `logs/approval-log.md` must contain "Checkpoint 2". If not, stop and point to `/99-website:keyword-sitemap`.
2. taste-skill (`design-taste-frontend`) and Impeccable must be installed. If `node "<base>/../../scripts/doctor.mjs"` shows `design_skills MISSING`, print its fix line and stop.
3. Scaffold the site if `site/` has no `package.json`: `node "<base>/../../scripts/scaffold-site.mjs" sites/<slug>`, then `npm install` inside `site/`, then `node "<base>/../../scripts/site-data.mjs" sites/<slug>`.

## Step 1: PRODUCT.md for Impeccable
Write `design/PRODUCT.md` from `business/` so `/impeccable init` has nothing to ask: what they sell, who visits and what worries them (brand-voice.md), the primary action (client.md `primary_cta`), visitor mode **Persuade**, brand words, colours named by the owner, never-say list.

## Step 2: Direction with taste-skill, under OUR overrides
Load taste-skill and apply these overrides, which beat its defaults:
- Stack: Astro + Tailwind v4, static HTML. No React, no Next.js, no Motion library, no client islands, no `'use client'`.
- Dials: `DESIGN_VARIANCE: 4`, `MOTION_INTENSITY: 2` (CSS hover and focus only, no scroll reveals), `VISUAL_DENSITY: 4`.
- Split hero is fine (text left, image right) if the phone view above the fold answers the 2-Second Rule: what they do, the offer, where, the next step, plus one trust signal.
- Fonts: two at most, self-hosted WOFF2, Latin subset, `font-display: swap`. No Inter, no Google Fonts `<link>`. Get the files with `npm install @fontsource/<family>` (or `@fontsource-variable/<family>`) in `site/`, copy only the `latin` WOFF2 weights you use into `site/public/fonts/`, and remove the package again.
- Never run: `gpt-taste`, `imagegen-*`, `brandkit`, Impeccable `animate`, `overdrive`, `delight`, `bolder`.
- Taste rules: no gradient text, no neon, no eyebrow label on every section, no fake stat counters, no `01 / 06` counters, no scroll cues, no em dashes, body text 45 to 75 characters wide, more space above headings than below.

## Step 3: Write the system
- `design/style.md`: palette (hex, with the owner's named colours first; check text contrast 4.5:1 or better), type scale, spacing scale, radius, button styles, section rhythm, and ONE image style block (lighting, lens, season, mood, what is always absent: people posing as the team, text, logos).
- Replace the `@theme` block in `site/src/styles/global.css` with the tokens, add the `@font-face` rules, and preload only the display font's hero weight in `Base.astro` (`<link rel="preload" as="font" type="font/woff2" crossorigin>`).
- Adjust `Header.astro`, `Footer.astro`, `CtaBand.astro` and the hero of `Home.astro` and `Service.astro` to the system. Structure and required elements stay as the starter has them.

## Step 4: Shape before code
Run `/impeccable shape` on the home page and the service template. Apply what fits the overrides; ignore anything that adds motion or effects.

## Step 5: Checkpoint 3 (home page top section)
1. Write `site/src/content/pages/home.json` with a real H1, intro, trust line and description from `business/` (the full home copy comes later in astro-build).
2. `npm run build` then `npm run preview` in `site/`. Open the home page in Chrome at 390px and 1280px widths. Screenshot both into `design/checkpoint-3-mobile.png` and `design/checkpoint-3-desktop.png`.
3. Show the owner both screenshots and `design/style.md` in 10 lines. Ask: approve, or what to change. Apply changes and show again.
4. Append to `logs/approval-log.md`: `| <date> | Checkpoint 3: design | <who> | <fonts, colours in one line> |`. Update project-state row `site-design` to done.

## House rules
- No em dashes. Nothing that moves on scroll. Real HTML headings always.
- The design must not look AI-generated: no centred-everything hero with a gradient blob, no three identical icon cards, no stock "smiling team" images.
