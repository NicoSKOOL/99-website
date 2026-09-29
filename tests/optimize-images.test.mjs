import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { optimize } from "../plugins/99-website/scripts/optimize-images.mjs";

const has = (cmd) => { try { execFileSync("which", [cmd], { stdio: "ignore" }); return true; } catch { return false; } };

test("makes 640/768/960/1600 WebP (768 = a 412px phone at 1.75x) and an images.json the starter can read", { skip: !has("cwebp") || !has("sips") }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "opt-"));
  const inDir = path.join(dir, "in"); fs.mkdirSync(inDir);
  // 2000x1500 solid PNG made with sips from a 1x1 PNG
  const onePx = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
  fs.writeFileSync(path.join(inDir, "hero.png"), onePx);
  execFileSync("sips", ["-z", "1500", "2000", path.join(inDir, "hero.png")], { stdio: "ignore" });
  const out = path.join(dir, "out");
  const r = optimize({ inDir, outDir: out });
  assert.deepEqual(r.hero.srcset.map((s) => s.w), [640, 768, 960, 1600]);
  assert.equal(r.hero.w, 2000);
  for (const w of [640, 768, 960, 1600]) assert.ok(fs.existsSync(path.join(out, `hero-${w}.webp`)));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out, "images.json"), "utf8")).hero.srcset.length, 4);
});
