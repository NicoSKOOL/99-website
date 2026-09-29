#!/usr/bin/env node
// FLUX.2 [pro] stills through the fal queue API. Saves the fal JSON first (lesson 3), then the image.
//   node fal-image.mjs "<prompt>" design/masters/hero.png --id hero --manifest design/images-manifest.json [--size landscape_4_3]
//   node fal-image.mjs --batch slots.txt --style "<style block>" --out design/masters --manifest design/images-manifest.json
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function loadKey() {
  if (process.env.FAL_KEY) return process.env.FAL_KEY;
  for (let dir = process.cwd(); ; dir = path.dirname(dir)) {
    const f = path.join(dir, ".env");
    const m = fs.existsSync(f) && fs.readFileSync(f, "utf8").match(/^FAL_KEY=["']?([^"'\n]+)/m);
    if (m) return m[1].trim();
    if (path.dirname(dir) === dir) break;
  }
  throw new Error("FAL_KEY not set (export it in ~/.zshrc, or add it to a .env)");
}
const sizeArg = (s) => { const m = String(s).match(/^(\d+)x(\d+)$/); return m ? { width: +m[1], height: +m[2] } : s; };

export async function generateImage({ prompt, out, id, manifest, size = "landscape_4_3", model = "fal-ai/flux-2-pro", key = loadKey(), fetchImpl = fetch, pollMs = 2500 }) {
  const headers = { Authorization: `Key ${key}`, "Content-Type": "application/json" };
  const input = { prompt, image_size: sizeArg(size), num_images: 1, output_format: "png" };
  const sub = await fetchImpl(`https://queue.fal.run/${model}`, { method: "POST", headers, body: JSON.stringify(input) });
  if (!sub.ok) throw new Error(`submit ${sub.status}: ${await sub.text()}`);
  const { request_id, status_url, response_url } = await sub.json();
  for (const t0 = Date.now(); ;) {
    if (pollMs) await new Promise((r) => setTimeout(r, pollMs));
    const st = await (await fetchImpl(status_url, { headers })).json();
    if (st.status === "COMPLETED") break;
    if (st.status === "FAILED" || st.error) throw new Error(`fal generation failed: ${JSON.stringify(st)}`);
    if (Date.now() - t0 > 600000) throw new Error("fal generation timed out after 10 minutes");
  }
  const res = await fetchImpl(response_url, { headers });
  if (!res.ok) throw new Error(`result ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const img = data.images?.[0];
  if (!img?.url) throw new Error(`no image in fal response: ${JSON.stringify(data).slice(0, 300)}`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const jsonFile = out.replace(/\.[a-z]+$/i, ".fal.json");
  fs.writeFileSync(jsonFile, JSON.stringify({ request_id, model, input, response: data }, null, 2));
  const buf = Buffer.from(await (await fetchImpl(img.url)).arrayBuffer());
  fs.writeFileSync(out, buf);
  if (manifest) {
    const list = fs.existsSync(manifest) ? JSON.parse(fs.readFileSync(manifest, "utf8")) : [];
    list.push({ id, file: out, json: jsonFile, model, prompt, size, request_id, date: new Date().toISOString() });
    fs.mkdirSync(path.dirname(manifest), { recursive: true });
    fs.writeFileSync(manifest, JSON.stringify(list, null, 2));
  }
  return { file: out, jsonFile, url: img.url, width: img.width, height: img.height };
}

// Batch: one slot per line, "id|size|scene". Runs 4 at a time and writes the manifest once at the end
// (parallel writers to one file lose rows). A re-generated id replaces its old manifest row.
export async function runBatch({ slotsText, style = "", outDir, manifest, concurrency = 4, ...opts }) {
  const slots = slotsText.trim().split(/\r?\n/).filter(Boolean).map((l) => l.split("|").map((s) => s.trim()));
  const rows = [];
  let failed = 0;
  const queue = [...slots];
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (queue.length) {
      const [id, size, scene] = queue.shift();
      const prompt = style ? `${scene} ${style}` : scene;
      try {
        const r = await generateImage({ ...opts, prompt, out: path.join(outDir, `${id}.png`), id, size, manifest: null });
        rows.push({ id, file: r.file, json: r.jsonFile, model: opts.model || "fal-ai/flux-2-pro", prompt, size, date: new Date().toISOString() });
        console.log(`ok   ${id} ${r.width}x${r.height}`);
      } catch (e) { failed++; console.log(`FAIL ${id}: ${e.message.slice(0, 160)}`); }
    }
  }));
  const old = fs.existsSync(manifest) ? JSON.parse(fs.readFileSync(manifest, "utf8")) : [];
  const ids = new Set(rows.map((r) => r.id));
  fs.mkdirSync(path.dirname(manifest), { recursive: true });
  fs.writeFileSync(manifest, JSON.stringify([...old.filter((r) => !ids.has(r.id)), ...rows], null, 2));
  return { ok: rows.length, failed };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = process.argv.slice(2);
  const opt = (n, d) => (a.includes(n) ? a[a.indexOf(n) + 1] : d);
  if (a.includes("--batch")) {
    // node fal-image.mjs --batch slots.txt --style "<style block>" --out design/masters --manifest design/images-manifest.json
    const r = await runBatch({ slotsText: fs.readFileSync(opt("--batch"), "utf8"), style: opt("--style", ""), outDir: opt("--out", "design/masters"), manifest: opt("--manifest", "design/images-manifest.json") });
    console.log(`${r.ok} generated, ${r.failed} failed`);
    process.exit(r.failed ? 1 : 0);
  }
  const [prompt, out] = a.filter((x, i) => !x.startsWith("--") && !a[i - 1]?.startsWith("--"));
  if (!prompt || !out) { console.error('usage: node fal-image.mjs "<prompt>" out.png --id name --manifest file [--size landscape_4_3]'); process.exit(1); }
  try {
    const r = await generateImage({ prompt, out, id: opt("--id", path.basename(out, path.extname(out))), manifest: opt("--manifest"), size: opt("--size", "landscape_4_3") });
    console.log(`saved ${r.file} (${r.width}x${r.height}), fal JSON ${r.jsonFile}`);
  } catch (e) { console.error(e.message); process.exit(1); }
}
