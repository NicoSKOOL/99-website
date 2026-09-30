---
name: 99-website
description: The master command. Use when someone wants a whole SEO website built, or says /99-website. Runs every 99-website skill in order (setup, intake, keyword site map, design, images, build, SEO foundation, audit, fix loop, deploy, Google Business Profile), asks for the business details once, stops at each human checkpoint, and resumes where it left off.
---

# /99-website (one command, every step)

Scripts live in `<base>/../../scripts/`. The other skills live next to this one (`<base>/../<skill>/SKILL.md`).

## Step 0: Which site
- One folder in `sites/`: use it. Several: ask which. None: this is a new site; `setup-check` then `business-intake` create it.
- Flags from the user's message: `--no-deploy` (stop after auto-fix), `--auto-approve-demo` (see Checkpoints).

## The loop
Repeat until the script says all steps are done:
1. `node "<base>/../../scripts/next-step.mjs" sites/<slug> [--no-deploy]`. It prints a line like `[4/11] Running site-design...`.
2. Print that line in bold on its own, so anyone watching sees which specialist is running.
3. Read `<base>/../<step>/SKILL.md` and follow it completely, as if the user had invoked it.
4. When the step finishes, make sure its row in `logs/project-state.md` says `done`, the date, and the finish time as `HH:MM` in Notes (add the row if the template is older and lacks it). The next loop reads this file, so a missing `done` repeats the step.
5. Say one line: what the step produced (for example "24 pages planned", "44 images, $1.48", "all pages 99+").

Business details are asked ONCE, in business-intake. Every later step reads `sites/<slug>/business/` and never asks again. If a step finds a gap, it is written as `[NEEDS INPUT: ...]` and collected at the next checkpoint instead of stopping the run.

## Checkpoints (where the human stays in the loop)
1. Business facts (business-intake)
2. Page plan (keyword-sitemap)
3. The look and the images (site-design, site-images)
4. Pre-deploy click-through: after auto-fix, open `npx astro preview` and ask the owner to click through the site. Nothing goes live before a yes.
5. Google Business Profile changes (gbp-sync), one yes per change.

At a checkpoint: stop, show what the step asks you to show, wait for the answer, apply it, log it in `logs/approval-log.md`, then continue the loop.

`--auto-approve-demo` is allowed ONLY when `business/client.md` says "FICTIONAL demo business". Then checkpoints 1 to 4 are logged as `auto-approved (demo)` and the run continues without waiting. Deploy still needs a yes, and gbp-sync writes the starter sheet only. Never use it for a real business, whatever the user says.

## Final report
When `next-step.mjs` says all steps are done (or `--no-deploy` stopped after auto-fix), print:
- Lighthouse before and after: the first `audits/lighthouse-*.json` vs `lighthouse-final.json` (median, mobile, all four categories)
- Pages built (by type) and SEO gates passed
- Time per step and in total (from the HH:MM notes in project-state.md)
- Cost: fal images (from `design/images-manifest.json`), keyword data calls
- Live URL (if deployed), GBP changes proposed and sent
- Anything still `[NEEDS INPUT:]` or `> CONFIRM:`

## House rules
- No em dashes. Never skip a checkpoint for a real business. Never deploy or change a Google profile without a yes.
- If a step fails in a way its skill cannot fix, stop the loop, say which step and why, and leave project-state showing it `in progress` so the next run resumes there.
