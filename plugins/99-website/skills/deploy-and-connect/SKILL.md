---
name: deploy-and-connect
description: Use after auto-fix passes and the owner has clicked through the finished site (Checkpoint 4). Deploys the static site and its form function to Cloudflare Pages, checks every live URL, and runs Lighthouse on the live home page. Never deploys without the owner's OK and never guesses the domain.
---

# Deploy to Cloudflare Pages

Scripts live in `<base>/../../scripts/`. Nothing here happens without the owner saying yes.

## Step 0: Preflight
1. `logs/approval-log.md` has "Checkpoint 4". The newest `audits/lighthouse-final.json` has no failures.
2. **Ask which Pages project name to use, and the domain if there is one. Never guess** (the wrong domain is the most common deploy mistake). Demo businesses (client.md says FICTIONAL) get a `pages.dev` staging URL only.

## Step 1: Build for the live address
Say the mode out loud before building:
- Staging or demo (keeps noindex): `node "<base>/../../scripts/site-data.mjs" sites/<slug> --site-url https://<project>.pages.dev`
- Real launch (indexable): `node "<base>/../../scripts/site-data.mjs" sites/<slug> --site-url https://<domain> --index`
Then `npm run build` in `site/` and re-run the three SEO gates (seo-foundation Step 2). The canonical, sitemap and schema URLs all come from `--site-url`; a build left on `http://localhost:4321` ships localhost canonicals.

## Step 2: Deploy
Run from `sites/<slug>/site/` so wrangler finds `functions/` (the form handler) next to `dist/`:
1. `npx wrangler whoami`. Not logged in: `npx wrangler login` (the owner clicks through in the browser).
2. First time only: `npx wrangler pages project create <project> --production-branch main`
3. `npx wrangler pages deploy dist --project-name <project> --branch main --commit-dirty=true`

## Step 3: Form settings
The form function reads its settings from Pages secrets. Values are typed by the owner, never written to a file or the chat log.
- Until email is connected: `npx wrangler pages secret put LOG_ONLY --project-name <project>` with value `1`. Leads then appear in the Pages Function log only.
- `TURNSTILE_SECRET` whenever `turnstile_site_key` is set in client.md (Cloudflare's test pair for demos: site key `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`).
- Email (only when the owner says to connect it): `RESEND_API_KEY`, `LEAD_TO`, `LEAD_FROM` (an address on a domain verified in Resend), `PHONE`, and delete `LOG_ONLY`.
- Secrets apply to the next deployment: redeploy (Step 2.3) after setting them.

## Step 4: Check the live site
1. `node "<base>/../../scripts/check-live.mjs" sites/<slug> https://<host>`: every sitemap URL 200, canonicals on the live host, noindex as chosen, form endpoint deployed. Fix and redeploy until it passes.
2. Lighthouse on the live home page, mobile, 3 runs: `npx -y lighthouse@12 https://<host>/ --quiet --chrome-flags=--headless=new --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=sites/<slug>/audits/lh-live-home-<n>.json`. Report the median.
3. Submit the form once with a test lead and confirm it lands (log or inbox).

## Step 5: Custom domain (real sites only)
Cloudflare dashboard, Workers & Pages, the project, Custom domains, Set up a domain. Manual, pause for the owner.

## Step 6: Report
Live URL, mode (staging or live), check-live result, live Lighthouse scores, form mode. Write the live URL into `business/client.md` (`domain:` for a real launch, a `staging_url:` note otherwise). Update project-state row `deploy-and-connect` to done.
GA4 and Search Console are the next manual steps and are not part of this skill yet.

## House rules
- No em dashes. Never deploy without a yes. Never remove noindex from a demo business.
