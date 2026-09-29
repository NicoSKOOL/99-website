---
name: business-intake
description: Use when starting a new 99-website build, onboarding a business, or rebuilding an existing website. Learns the business by interview (new build) or by crawling the old site and asking only about gaps (rebuild), and writes everything into sites/<slug>/business/ for every later step to read. Ends at Checkpoint 1 (business facts approved).
---

# Business intake

You learn the business well enough to decide how many money pages it needs. You research. You do not invent. Every fact goes in with a source, and every guess goes in with a `> CONFIRM:` line so the owner can fix it in seconds. A wrong fact here poisons every page later.

Scripts live in `<base>/../../scripts/` (`<base>` = the "Base directory for this skill" shown above).

## Step 0: Preflight

1. Read `.99-website/setup.json`. If it is missing, say "Run /99-website:setup-check first" and stop. Note the `keyword_path`.
2. Ask (skip if the user already gave a URL or said there is no site): "Do you already have a website? If yes, paste the URL." A URL = **rebuild mode**. No site = **new mode**.
3. Pick a slug from the business name or domain (lowercase, hyphens, e.g. `my-inclusion`). Run `node "<base>/../../scripts/site-init.mjs" <slug> --root sites`. It never overwrites files; if it reports skipped files, this is a re-run: read what is there first and only fill gaps.
4. Set `mode` in `business/client.md` front matter.

## Step 1 (rebuild mode): Read the old site

1. Run `node "<base>/../../scripts/crawl.mjs" <url> --out sites/<slug>/research/crawl --limit 150`.
   - Exit 2 (site blocks fetching): read the home, services, about and contact pages with the WebFetch tool instead, and note "crawler blocked" in `logs/decision-log.md`.
2. Read `research/crawl/summary.json`, then the pages in `pages.jsonl` that matter: home, every service page, about, contact, areas/locations, testimonials. Use `title`, `h1`, `h2`, `text`, `tel`, `mailto`, `jsonld_types`.
3. Pull out, quoting the site where it matters: business name, what they sell in one sentence, the full services list in their words, every place they name, prices or "from" prices, proof (years, registrations, awards, published numbers), phone, email, address, hours, how they want to be contacted.
4. Search Console (optional): if a DataWise `datawise_search_console` tool exists and the domain is set up in DataWise, pull the top pages by clicks for the last 90 days into `research/gsc-top-pages.csv` with columns `url,clicks,impressions,top_query`. If the call errors or the site is not set up, write "GSC not available through DataWise" in `logs/decision-log.md` and continue. These pages must not be thrown away in the rebuild.

## Step 2: Read the notes folder

Read every `.md` and `.txt` in `business/notes/`. Treat them as claims to confirm, not facts. If a note disagrees with the site, the newer source wins and the difference becomes a `> CONFIRM:` line.

## Step 3: Check the Google Business Profile

Search the web for "<business name> <city>" to find the Google Business Profile. Record the exact name, address and phone shown. Any mismatch with the site (different phone, missing address) is a `> CONFIRM:` line, never a silent pick.

## Step 4: Detect a sensitive niche

Set `sensitive_niche: true` for: health, medical, dental, mental health, disability and NDIS, aged care, childcare, legal, finance, insurance. Then add rules to the Compliance section of `brand-voice.md`:

- No outcome guarantees or cure/result promises.
- No invented client stories, testimonials or case studies.
- Respectful, person-first language (the business's own voice wins where it differs).
- Registrations, accreditations and licences stated only if confirmed.
- NDIS: registration status only if confirmed; no prices unless they match the NDIS Pricing Arrangements and the owner confirms them.

## Step 5: Ask only for the gaps

New mode: ask all ten questions below, **one at a time**, skipping any that an earlier answer already covered. Rebuild mode: ask only the ones still unanswered or marked CONFIRM after Steps 1 to 3.

1. Business name, phone, email, address (or "service area only"), hours.
2. Every service you offer, in the words your customers use.
3. Which 3 to 5 services make the most money, and which do you want less of?
4. Price range or "from" price per service, or "don't show prices".
5. Your home city, and every other town you actually travel to.
6. Proof: reviews (where, how many), licences, insurance, years, guarantees, real photos.
7. Who do you lose jobs to?
8. What should a new lead do: call, fill in a form, or book online?
9. Brand feel: 2 or 3 websites you like, your colours, or "choose for me".
10. Anything you never want said?

Photos: ask the owner to drop real photos into `business/photos/`. Design references (question 9) go in `design/references/`.

## Step 6: Write the files

- `business/client.md`: fill the front matter (country, `location_code`, `language_code`, `home_city`, `primary_cta`, NAP) and the sections. Keep it under about 600 words.
- `business/services.md`: one block per service. Mark money-makers.
- `business/areas.md`, `proof.md`, `competitors.md`, `brand-voice.md` (tone from their real copy, not a template voice).
- Every fact carries its source: a page path (`/about/`), a note file name, or "owner answer".
- Confident fact: write it plainly. Guess or conflict: write the best guess, then a `> CONFIRM:` line directly under it saying what to check. Unknown and no guess possible: `[NEEDS INPUT: what is needed]`.
- NEVER invent review counts, ratings, outcomes, revenue, registrations, awards, prices or addresses. "Not found on the site" is a valid answer.

Common location codes: Australia 2036, United States 2840, United Kingdom 2826, Canada 2124, New Zealand 2554.

## Step 7: Checkpoint 1 (business facts)

1. Run `node "<base>/../../scripts/confirm-count.mjs" sites/<slug>`.
2. Show the owner: a 10-line summary (what they sell, money-maker services, home city plus areas, primary CTA, NAP, sensitive niche yes/no), then **one numbered list of every `> CONFIRM:` and `[NEEDS INPUT:]`**, with the file each is in.
3. Ask them to answer the list in chat or edit the files directly. Update the files with each answer (remove the CONFIRM line once answered) and re-run the counter.
4. Continue only when the count is 0, or the owner says which items to leave open on purpose.
5. Append to `logs/approval-log.md`: `| <YYYY-MM-DD> | Checkpoint 1: business facts | <who approved> | <n> items left open: <list or none> |`
6. Update the `business-intake` row in `logs/project-state.md` to `done` with the date.
7. Suggest the next command: `/99-website:keyword-sitemap`.

## House rules

- No em dashes anywhere.
- One question per message.
- When in doubt, flag it rather than guess. The confirm list is a feature.
- Do not start keyword research here.
