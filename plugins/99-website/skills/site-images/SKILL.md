---
name: site-images
description: Use after site-design is approved (Checkpoint 3). Fills every image slot on the page plan, real photos from business/photos first, otherwise FLUX.2 [pro] on fal.ai with the site's one image style block, then converts everything to WebP at 640, 960 and 1600 widths.
---

# Site images

Scripts live in `<base>/../../scripts/`.

## Step 0: Preflight
1. `logs/approval-log.md` must contain "Checkpoint 3". `design/style.md` must have an image style block.
2. `FAL_KEY` must be set (doctor `keys` OK). If the fal MCP is connected, call its pricing tool for `fal-ai/flux-2-pro` and say the price per image out loud (about $0.03 per megapixel on 2026-09-29).

## Step 1: List the slots
Write `design/image-slots.md`: one hero per built service page, one home hero, one per area page only if it earns it (a local landscape scene, never a fake local job), blog post heroes for `phase=now` posts. Name each slot `<slug>-hero` (home: `home-hero`). Plus **four process slots per service page**, `<slug>-step-1` to `<slug>-step-4`: one photo per real stage of the job (marked out, dug, base built, finished), each scene specific to that service. A page with only a finished shot reads as a brochure; the process photos are what make each service page its own. Process scenes show the work, tools and materials with the crew out of frame (no people, no hands). Target 12 to 16 heroes plus 4 per service (about 45 images and $1.50 for an 8-service site).

## Step 2: Real photos first
Anything in `business/photos/` that fits a slot is used as that slot's master (copy to `design/masters/<slot>.jpg`). Mark it `source: real` in the slots file.

## Step 3: Generate the rest
For each remaining slot, one prompt = the slot's scene + the style block from `design/style.md` + add-ons where needed (`no people, no text, no logos, no watermark`). Rules:
- Never a scene that looks like proof: no team, no vans, no branded shirts, no "a job we did", no before/after.
- Never ask for text in the image.
- No reference image unless you deliberately want an edit of that image.
- Default size `landscape_4_3`; hero images that sit beside text can be `portrait_4_3`.
- The style block describes light, lens, season and mood. It never names specific objects ("oak and crape myrtle"), or the model puts them in EVERY image and the set looks machine-made. Put objects in each slot's scene instead, and vary them.
- Wide full-bleed images (photo bands, anything wider than half the screen) need an explicit size of at least `1920x1080`; the named sizes come back only 1024px wide.
Write all slots to `design/image-slots.txt`, one per line as `slot|size|scene`, and run them in one batch (4 at a time, manifest written once at the end):
`node "<base>/../../scripts/fal-image.mjs" --batch sites/<slug>/design/image-slots.txt --style "<style block>" --out sites/<slug>/design/masters --manifest sites/<slug>/design/images-manifest.json`
A single slot can be redone with `node "<base>/../../scripts/fal-image.mjs" "<prompt>" <out.png> --id <slot> --manifest <manifest>`.
Look at every image. Regenerate (max 2 retries per slot) anything with warped geometry, text, people, or a style that does not match. Log retries in the slots file.

## Step 4: Optimize
`node "<base>/../../scripts/optimize-images.mjs" --in sites/<slug>/design/masters --out sites/<slug>/site/public/img`
Every image must fit the 90 KB budget at 960w (the default). At 180 KB the images below the fold competed with the hero on a throttled phone connection and cost 4 Performance points on Cedar & Stone.

## Step 5: Checkpoint (images)
Show the owner a contact sheet (`design/contact-sheet.html`: every master in a 4-column grid with its slot name, opened in the browser) with slot names and cost so far. Approve, or name the slots to redo. Append `| <date> | Checkpoint: images | <who> | <n> images, $<cost> |` to `logs/approval-log.md`.

## House rules
- No em dashes. Real beats AI. AI never poses as proof.
