import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { generateImage } from "../plugins/99-website/scripts/fal-image.mjs";

test("saves the fal JSON before downloading, then logs the manifest", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fal-"));
  const out = path.join(dir, "masters/hero.png");
  const calls = [];
  let jsonExistedAtDownload = false;
  const fetchImpl = async (url, opts = {}) => {
    calls.push(url);
    if (opts.method === "POST") return new Response(JSON.stringify({ request_id: "r1", status_url: "https://q/status", response_url: "https://q/result" }));
    if (url === "https://q/status") return new Response(JSON.stringify({ status: "COMPLETED" }));
    if (url === "https://q/result") return new Response(JSON.stringify({ images: [{ url: "https://cdn/img.png", width: 1024, height: 768 }] }));
    if (url === "https://cdn/img.png") { jsonExistedAtDownload = fs.existsSync(path.join(dir, "masters/hero.fal.json")); return new Response(new Uint8Array([1, 2, 3])); }
    throw new Error(`unexpected ${url}`);
  };
  const r = await generateImage({ prompt: "a patio", out, id: "hero", manifest: path.join(dir, "m.json"), key: "k", fetchImpl, pollMs: 0 });
  assert.ok(jsonExistedAtDownload, "fal JSON must be on disk before the image download starts");
  assert.equal(fs.readFileSync(out).length, 3);
  const m = JSON.parse(fs.readFileSync(path.join(dir, "m.json"), "utf8"));
  assert.equal(m[0].id, "hero");
  assert.equal(m[0].model, "fal-ai/flux-2-pro");
  assert.equal(m[0].request_id, "r1");
  assert.equal(r.width, 1024);
  assert.equal(calls[0], "https://queue.fal.run/fal-ai/flux-2-pro");
});

test("a failed generation throws and writes no image", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fal-"));
  const fetchImpl = async (url, opts = {}) => {
    if (opts.method === "POST") return new Response(JSON.stringify({ request_id: "r2", status_url: "https://q/s", response_url: "https://q/r" }));
    return new Response(JSON.stringify({ status: "FAILED", error: "nsfw" }));
  };
  await assert.rejects(generateImage({ prompt: "x", out: path.join(dir, "a.png"), id: "a", manifest: path.join(dir, "m.json"), key: "k", fetchImpl, pollMs: 0 }), /failed/);
  assert.ok(!fs.existsSync(path.join(dir, "a.png")));
});

test("batch: generates every slot, 4 at a time, and writes the manifest once with no lost rows", async () => {
  const { runBatch } = await import("../plugins/99-website/scripts/fal-image.mjs");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "falb-"));
  let n = 0;
  const fetchImpl = async (url, opts = {}) => {
    if (opts.method === "POST") { n++; return new Response(JSON.stringify({ request_id: `r${n}`, status_url: `https://q/s${n}`, response_url: `https://q/r${n}` })); }
    if (url.includes("/s")) return new Response(JSON.stringify({ status: "COMPLETED" }));
    if (url.includes("/r")) return new Response(JSON.stringify({ images: [{ url: "https://cdn/x.png", width: 8, height: 6 }] }));
    return new Response(new Uint8Array([1]));
  };
  const slots = "a|landscape_4_3|Scene A.\nb|landscape_16_9|Scene B.\nc|1920x1080|Scene C.\n";
  const manifest = path.join(dir, "m.json");
  fs.writeFileSync(manifest, JSON.stringify([{ id: "a", old: true }, { id: "keep" }]));
  const r = await runBatch({ slotsText: slots, style: "STYLE.", outDir: path.join(dir, "masters"), manifest, key: "k", fetchImpl, pollMs: 0 });
  assert.equal(r.ok, 3);
  const m = JSON.parse(fs.readFileSync(manifest, "utf8"));
  assert.deepEqual(m.map((x) => x.id).sort(), ["a", "b", "c", "keep"]);
  assert.ok(!m.find((x) => x.id === "a").old, "a re-generated slot replaces its old manifest row");
  assert.equal(m.find((x) => x.id === "b").prompt, "Scene B. STYLE.");
  for (const id of ["a", "b", "c"]) assert.ok(fs.existsSync(path.join(dir, "masters", `${id}.png`)));
});
