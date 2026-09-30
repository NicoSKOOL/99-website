---
name: auto-fix
description: Use after site-audit when anything is below 99 or a SEO gate fails. Fixes the prioritised list in the templates and content, re-audits, and keeps a fix only if nothing else got worse. Stops after 3 passes and reports what is left. Works on any Astro site in sites/<slug>/site.
---

# Auto-fix (the loop to 99)

Scripts live in `<base>/../../scripts/`. Input: the newest `audits/audit-<label>.md`.

## The guardrail (read before every pass)
You are fixing a real business's website, not chasing a number. NEVER:
- remove or hide an image, section, page, link, testimonial, FAQ or the estimate form
- add `noindex`, or block anything in robots.txt
- re-encode WebP below quality 40, or swap the self-hosted fonts for system fonts
- delete copy to make a page lighter, or change a fact from `business/`
If the only way to 99 is one of these, stop and tell Nico what the trade is.

## One pass
1. `git -C sites/<slug>/site init` if it is not a repo yet, then commit the current state as "before pass N".
2. Fix P1 items first, then P2. Fix in the TEMPLATE or component when the same failure is on several pages (templates, not pages). Common fixes are in the audit's "Fix:" hints.
3. Rebuild, re-run the three SEO gates (they must still pass). A site not built by 99-website (no `site/src/data/site.json`) has no gates: check titles, one H1, canonicals, image sizes and schema by reading the built HTML instead.
4. `lighthouse-gate.mjs sites/<slug> --label pass-N`, then `compare-audits.mjs sites/<slug> <previous-label> pass-N`.
5. Regression (exit 1): revert that pass with `git -C sites/<slug>/site checkout -- .`, write in `audits/fix-log.md` what you tried and why it made things worse, and try a different fix next pass.
6. No regression: commit "pass N" in the site repo.

## Stop
- Everything 99+ and the gates pass: run `site-audit` with `--label final --all --runs 1` and report the before/after table.
- After pass 3 with anything still under 99: stop, list what is left, and what each remaining fix would cost (the guardrail trade). Never loop forever.

## Improve the system (Nico's rule)
If a fix belongs in every future site (a template or starter change), port it to `templates/astro-starter/` in the plugin repo and log it in the design doc's test notes. That is how the next site starts at 99.

Update project-state row `auto-fix` with passes used and final scores.
