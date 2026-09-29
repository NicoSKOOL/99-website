---
name: keyword-sitemap
description: Use after business-intake is approved, to turn real keyword data into the site's page plan. Researches keywords (DataWise, DataForSEO, or pasted keywords), checks the live search results, decides how many service pages the business needs, plans 3 to 5 blog posts, maps old URLs for rebuilds, and writes research/site-map.csv. Ends at Checkpoint 2 (page plan approved).
---

# Keyword research that becomes the site map

The page plan is the most important decision in the whole build. Every page must earn its place with real demand, a real service, and something unique to say.

Scripts live in `<base>/../../scripts/` (`<base>` = the "Base directory for this skill" shown above).

## Step 0: Preflight

1. Find the site folder `sites/<slug>/` (ask if there is more than one).
2. `logs/approval-log.md` must contain "Checkpoint 1". If not, say "Run /99-website:business-intake first" and stop.
3. Read `.99-website/setup.json` for `keyword_path`. If missing, stop and ask for `/99-website:setup-check`.
4. Read all of `business/` (including `notes/`). Take `location_code` and `language_code` from `client.md` front matter. Never default to the US for a non-US business.

## Step 1: Seeds

From `services.md` and `areas.md`: each service in the customer's words, each service plus the home city, and obvious customer phrasings ("<service> near me", "<service> cost"). Keep it to 50 seeds or fewer. For a sensitive niche, use the niche's real search terms (for NDIS: "ndis <service>", "<service> provider").

Rebuild mode: the site's own Search Console queries are the best seeds there are, because they are what Google already tests the site for. If `datawise_search_console` is available, pull `action: queries` (limit 200) for the property in `client.md` and add the relevant ones as seeds. Skip brand queries, addresses and junk (number strings). Never seed a phrase for something `services.md` says they do not do (My Inclusion: no "cleaning" keywords, even though the old site ranked for them).

## Step 2: Expand and measure

Use the tools for the `keyword_path`. MCP tool names may carry a prefix; match on the ending.

| Job | datawise | dataforseo | manual |
|---|---|---|---|
| Find keywords | `datawise_keyword_research` | `dataforseo_labs_google_keyword_ideas` or `dataforseo_labs_google_related_keywords` | Ask the owner to paste keywords (from Keyword Planner, GSC, a client list) |
| Volume, CPC, KD, intent | `datawise_keyword_metrics` (up to 50 keywords per call) | `kw_data_google_ads_search_volume` + `dataforseo_labs_bulk_keyword_difficulty` + `dataforseo_labs_search_intent` | leave blank |
| Questions for FAQs and blog posts | `datawise_people_also_ask` | `serp_organic_live_advanced` (People Also Ask items) | read the live SERP |
| Who ranks | `datawise_competitors` | `dataforseo_labs_google_serp_competitors` | read the live SERP |

Rules:
- Batch: one `keyword_metrics` call per 50 keywords. Stop expanding at about 300 keywords. DataWise has a daily data allowance ($4 per day by default), so do not loop.
- Search-volume APIs reject keywords over 10 words or with punctuation: clean them first.
- Save every keyword to `research/keywords.csv` with `keyword,volume,cpc,kd,intent,seed,source_tool`. Blank stays blank; `0` stays `0`.
- Small markets (for example Australian suburbs) often show 0. That is normal, not a failure.

## Step 3: Cluster

Group keywords that describe the same job and would be answered by the same page. Name each cluster by the highest-volume phrasing a customer uses. Variations of one idea (plural, word order, "near me") are one cluster, never separate pages.

## Step 4: Read the live results

For the top 15 clusters by importance to the business, read the live Google results (`serp_organic_live_advanced` if a DataForSEO tool is connected, otherwise the WebSearch tool, searching as a user in the business's country). For each, note in `research/serp-notes.md`: do the top results show dedicated service pages from local businesses (a separate page is justified), directories and aggregators, or articles (a blog post, not a service page)?

## Step 5: Publication gate

A cluster gets its own page only if ALL are true:
1. **Demand:** volume above 0, OR it is a money-maker service in `services.md` and the results show service pages ranking (small markets).
2. **Results support it:** the live results show pages about exactly this, not one page covering everything.
3. **They do it:** it is in `services.md` (never plan a page for a service they do not offer).
4. **Unique content:** there is enough real, different information (process, scope, price signal, proof) to make it at least 50% different from sibling pages.

Record each decision (kept, merged into another page as a section, turned into an FAQ, dropped) in the `notes` column or `serp-notes.md`.

## Step 6: Intent to page type

- Transactional: service page. Commercial: comparison blog post. Informational: blog post, or an FAQ on the related service page when the answer is short. Navigational: existing page (home, contact). Question variations: FAQ block, never a page per variation.
- Home page targets "<main service> <home city>". There is no area page for the home city.
- Area pages (`/areas-served/<town>-<state>/`) only when `areas.md` lists at least two towns beyond the home city AND there is demand or the results support local pages. No service times town matrix.
- Rebuild mode: **pages that already exist keep their URL**, even when it breaks the pattern above (My Inclusion keeps `/locations/<suburb>/` and the `/locations/` hub). A page that ranks or earns impressions is not moved to match our pattern. Only brand-new pages follow the pattern. Existing blog posts with clicks or impressions are kept (`keep`), each with its own target keyword from its best GSC query; they count toward the blog, so plan only the new posts on top.
- Blog: plan 3 to 5 posts, each answering a real question from Step 2 and each linking up to one service page. The first 2 are `phase=now`, the rest `later`.
- Always include: `/` (home), `/services/` (hub), `/about/`, `/contact/`, `/privacy-policy/` (legal). Add `/areas-served/` and `/blog/` hubs only if they have children.

## Step 7: Write `research/site-map.csv`

Header, exactly: `url,slug,page_name,title_tag,page_type,parent,target_keyword,volume,kd,intent,primary_cta,phase,data_source,notes`

- `page_type`: home, hub, service, area, blog, about, contact, legal.
- `url`: `/services/<slug>/`, `/areas-served/<town>-<state>/`, `/blog/<question-slug>/`, `/<slug>/` for about, contact, legal. Lowercase, hyphens, trailing slash, keyword only (no filler, no dates).
- `title_tag`: 60 characters or fewer, keyword first, then a differentiator, then the brand. Unique. For a sensitive niche, no promises.
- `target_keyword`: one per page, never repeated. Blank for hub, about, contact, legal.
- `volume`, `kd`: straight from the tool, or blank. Never estimated.
- `primary_cta`: from `client.md` (`call`, `form`, `booking`).
- `data_source`: the `keyword_path`, same on every row.
- Quote any field that contains a comma.

## Step 8: Write `research/blog-plan.md`

For each post: title, the question it answers, target keyword with volume and source, the service page it links to, why it is a post and not an FAQ (the results show full articles, or the AI Overview splits the answer into 2 or more sections), and phase.

## Step 9 (rebuild mode): Map the old URLs

Write `research/rebuild-redirects.csv` with `old_url,new_url,status,notes`. Every path in `research/crawl/pages.jsonl` gets a row:
- `keep`: same URL exists in the new plan.
- `301`: points straight to the closest new page (no chains).
- `410`: removed with no equivalent (write why in `notes`).
A page listed in `research/gsc-top-pages.csv` with clicks is never `410` without a `> CONFIRM:` for the owner.
The crawl only sees pages in the sitemap. Also check `gsc-top-pages.csv` for URLs the crawl missed (for example the same path without a trailing slash) and give them a `301` row to the slash version.

## Step 10: Validate

Run `node "<base>/../../scripts/validate-sitemap.mjs" sites/<slug>/research/site-map.csv` (rebuild mode: add `--crawl sites/<slug>/research/crawl/pages.jsonl` so existing URLs may keep their path) and, in rebuild mode, `node "<base>/../../scripts/validate-redirects.mjs" --crawl sites/<slug>/research/crawl/pages.jsonl --redirects sites/<slug>/research/rebuild-redirects.csv --sitemap sites/<slug>/research/site-map.csv`. Fix every ERROR and re-run until both pass. Read the WARN lines and act on them.

## Step 11: Checkpoint 2 (page plan)

Show the owner:
1. A table: url, target keyword, volume, intent, phase.
2. Page count by type, and one paragraph: "Why this many service pages" (which clusters passed the gate, which were merged, dropped or turned into FAQs, and why).
3. The blog plan titles.
4. Rebuild: redirect counts (keep, 301, 410) and any CONFIRM items.
5. Data source line: "Keyword data: <datawise|dataforseo|manual>, <country>".

Wait for approval. Apply changes, re-validate, show again. Then:
- Append to `logs/approval-log.md`: `| <YYYY-MM-DD> | Checkpoint 2: page plan | <who approved> | <n> pages (<n> service, <n> blog now) |`
- Update the `keyword-sitemap` row in `logs/project-state.md` to `done`.
- Say: "Page plan approved. Next stage: design and build."

## House rules

- No em dashes.
- Never estimate a number. Never plan a page for a service they do not offer.
- Fewer, stronger pages beat many thin ones.
