#!/usr/bin/env node
// Masters (PNG/JPG) -> WebP at 640/768/960/1600 + images.json for the starter's Img component.
//   node optimize-images.mjs --in design/masters --out site/public/img [--budget-kb 90]
// Needs cwebp (brew install webp) and sips (macOS). Quality steps down to 40 until the 960w file fits.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

function dims(file) {
  const out = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", "-g", "hasAlpha", file]).toString();
  return { w: +out.match(/pixelWidth: (\d+)/)[1], h: +out.match(/pixelHeight: (\d+)/)[1], alpha: /hasAlpha: yes/.test(out) };
}
function encode(src, dst, w, q, alpha) {
  const a = ["-quiet", "-q", String(q), "-m", "6", "-resize", String(w), "0", "-metadata", "none"];
  if (alpha) a.push("-alpha_q", "60", "-exact");
  execFileSync("cwebp", [...a, src, "-o", dst]);
  return fs.statSync(dst).size;
}

export function optimize({ inDir, outDir, widths = [640, 768, 960, 1600], q = 72, budgetKb = 90 }) {
  fs.mkdirSync(outDir, { recursive: true });
  const reportFile = path.join(outDir, "images.json");
  const report = fs.existsSync(reportFile) ? JSON.parse(fs.readFileSync(reportFile, "utf8")) : {};
  const failed = [];
  for (const f of fs.readdirSync(inDir).filter((x) => /\.(png|jpe?g)$/i.test(x)).sort()) {
    const name = path.basename(f, path.extname(f));
    const src = path.join(inDir, f);
    const d = dims(src);
    const ws = widths.filter((w) => w <= d.w);
    const use = ws.length ? ws : [d.w];
    const bw = use.includes(960) ? 960 : use[use.length - 1];
    let quality = q;
    let size;
    for (;;) {
      size = encode(src, path.join(outDir, `${name}-${bw}.webp`), bw, quality, d.alpha);
      if (size / 1024 <= budgetKb || quality <= 40) break;
      quality -= 4;
    }
    for (const w of use) if (w !== bw) encode(src, path.join(outDir, `${name}-${w}.webp`), w, quality, d.alpha);
    if (size / 1024 > budgetKb) failed.push(name);
    report[name] = { srcset: use.map((w) => ({ file: `${name}-${w}.webp`, w })), w: d.w, h: d.h, alpha: d.alpha, q: quality };
    console.log(`${size / 1024 <= budgetKb ? "ok  " : "FAIL"} ${name}: ${bw}w ${(size / 1024).toFixed(0)} KB (budget ${budgetKb}), q${quality}`);
  }
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  if (failed.length) throw new Error(`${failed.length} image(s) over budget: ${failed.join(", ")}`);
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = process.argv.slice(2);
  const opt = (n, d) => (a.includes(n) ? a[a.indexOf(n) + 1] : d);
  try { optimize({ inDir: opt("--in", "design/masters"), outDir: opt("--out", "site/public/img"), budgetKb: +opt("--budget-kb", 90) }); }
  catch (e) { console.error(e.message); process.exit(1); }
}
