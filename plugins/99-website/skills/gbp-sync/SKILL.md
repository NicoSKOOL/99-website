---
name: gbp-sync
description: Use after the site is built or live, to make the Google Business Profile and the website describe the same business. Reads the profile (read-only), compares name, phone, website, services, service area, categories and description with the site, and writes a list of proposed changes. Nothing is sent to the profile without the owner's yes per change. For a business with no profile yet, writes a profile starter sheet.
---

# GBP sync (the profile and the site as one business)

Scripts live in `<base>/../../scripts/`. Reading is automatic. Writing never is.

## Step 1: Read the profile
Use whichever connection `setup-check` found. MCP tool names may carry a prefix; match on the ending.
- PostProxy: `profiles_list` (platform `google_business`), `profiles_placements` (pick the location by name), then `google_business_location_get`.
- Windsor.ai: the `google_my_business` connector (`get_data`), then `list_actions` for what it can edit.
- Neither: ask the owner to paste name, phone, website, categories, services, service area and description.
No profile at all (demo businesses always): skip to Step 4.

Save `sites/<slug>/audits/gbp-snapshot.json`: `{ name, phone, website, primaryCategory, categories: [], services: [], serviceArea: [], description, source }` (services = the `serviceItems` display names; serviceArea = the `placeName` values). Never copy the address into the snapshot.

## Step 2: Compare
`node "<base>/../../scripts/gbp-parity.mjs" sites/<slug>` writes `audits/gbp-parity.md` (name, phone, website host, services with renames for near matches, service area towns).

## Step 3: What the script cannot judge (read and add to gbp-parity.md)
1. **Description vs the never-say list** in `business/brand-voice.md` and the do-ourselves / coordinate / never-say answers from intake. (My Inclusion: the profile offers "decluttering help"; the business only coordinates hoarding support and must never say cleaning.) Draft a new description, 750 characters max, facts from `business/` only.
2. **Categories vs what they really do.** The primary category must match the main service page. An extra category that pulls in services they do not offer (My Inclusion's "Gardener" category brings lawn mowing and pest control job types) gets a question for the owner, not an automatic removal.
3. **Service area limit:** Google allows 20 places. If the site's towns plus the profile's exceed 20, propose which to keep (money-making towns first, from `areas.md`).

## Step 4: No profile yet: the starter sheet
Write `audits/gbp-starter-sheet.md`: business name exactly as on the site, primary category matching the main service, 2 to 4 secondary categories only for services with a page, the services list using the exact page names (each with its page URL), service area towns from `areas.md` (20 max), a description under 750 characters from `client.md`, website = the live home page, hours, and phone identical to the site. Ready to paste during profile setup.

## Step 5: Checkpoint 5 (profile changes)
Show `gbp-parity.md` as a numbered list of changes. For each one the owner says yes to, and only then: send it (PostProxy `google_business_location_update` or `google_business_service_list_update` after re-reading the location, because updates are field-masked; or Windsor `execute_action`). Re-read the profile afterwards and re-run Step 2.
Never change the address (it can trigger re-verification). Never change anything on a profile the owner has not approved in this session.
Append `| <date> | Checkpoint 5: GBP | <who> | <n> changes approved, <n> sent |` to `logs/approval-log.md` and update project-state row `gbp-sync`.

## House rules
- No em dashes. Read-only by default. The site's facts come from `business/`; the profile is made to match the site, not the other way round, unless the owner says the profile is right.
