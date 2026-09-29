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
Write `design/image-slots.md`: one hero per built service page, one home hero, one per area page only if it earns it (a local landscape scene, never a fake local job), blog post heroes for `phase=now` posts. Name each slot `<slug>-hero` (home: `home-hero`). Target 10 to 16 images for a 20-page site.

## Step 2: Real photos first
Anything in `business/photos/` that fits a slot is used as that slot's master (copy to `design/masters/<slot>.jpg`). Mark it `source: real` in the slots file.

## Step 3: Generate the rest
For each remaining slot, one prompt = the slot's scene + the style block from `design/style.md` + add-ons where needed (`no people, no text, no logos, no watermark`). Rules:
- Never a scene that looks like proof: no team, no vans, no branded shirts, no "a job we did", no before/after.
- Never ask for text in the image.
- No reference image unless you deliberately want an edit of that image.
- Default size `landscape_4_3`; hero images that sit beside text can be `portrait_4_3`.
Run per slot:
`node "<base>/../../scripts/fal-image.mjs" "<prompt>" sites/<slug>/design/masters/<slot>.png --id <slot> --manifest sites/<slug>/design/images-manifest.json`
Look at every image. Regenerate (max 2 retries per slot) anything with warped geometry, text, people, or a style that does not match. Log retries in the slots file.

## Step 4: Optimize
`node "<base>/../../scripts/optimize-images.mjs" --in sites/<slug>/design/masters --out sites/<slug>/site/public/img`
Every image must fit the 180 KB budget at 960w.

## Step 5: Checkpoint (images)
Show the owner a contact sheet (all 960w WebPs in one HTML page opened in the browser) with slot names and cost so far. Approve, or name the slots to redo. Append `| <date> | Checkpoint: images | <who> | <n> images, $<cost> |` to `logs/approval-log.md`.

## House rules
- No em dashes. Real beats AI. AI never poses as proof.
