#!/usr/bin/env node
// Copy templates/astro-starter into sites/<slug>/site. Never overwrites an existing file.
//   node scaffold-site.mjs sites/<slug>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../templates/astro-starter");
const SKIP = new Set(["node_modules", "dist", ".astro", ".wrangler"]);

function list(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (SKIP.has(e.name)) return [];
    const p = path.join(dir, e.name);
    return e.isDirectory() ? list(p, base) : [path.relative(base, p)];
  });
}

export function scaffoldSite(siteDir, templateDir = DEFAULT) {
  const dest = path.join(siteDir, "site");
  const created = [];
  const skipped = [];
  for (const rel of list(templateDir)) {
    const to = path.join(dest, rel);
    if (fs.existsSync(to)) { skipped.push(rel); continue; }
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(path.join(templateDir, rel), to);
    created.push(rel);
  }
  return { created, skipped };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const siteDir = process.argv[2];
  if (!siteDir) { console.error("usage: node scaffold-site.mjs sites/<slug>"); process.exit(1); }
  const r = scaffoldSite(siteDir);
  console.log(`created ${r.created.length}, skipped ${r.skipped.length} (existing files are never overwritten)`);
}
