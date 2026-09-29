#!/usr/bin/env node
// Scaffold sites/<slug>/ from templates/site/. Never overwrites an existing file.
//   node site-init.mjs <slug> [--root sites]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const TEMPLATE = path.join(path.dirname(fileURLToPath(import.meta.url)), "../templates/site");
const EMPTY_DIRS = ["business/photos", "research", "design/references", "site", "audits"];
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function listFiles(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? listFiles(p, base) : [path.relative(base, p)];
  });
}

export function initSite(root, slug) {
  if (!SLUG_RE.test(slug)) throw new Error(`invalid slug "${slug}": use lowercase letters, numbers and hyphens, like my-inclusion`);
  const siteDir = path.join(root, slug);
  const created = [];
  const skipped = [];
  for (const rel of listFiles(TEMPLATE)) {
    const dest = path.join(siteDir, rel);
    if (fs.existsSync(dest)) { skipped.push(rel); continue; }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(TEMPLATE, rel), dest);
    created.push(rel);
  }
  for (const d of EMPTY_DIRS) fs.mkdirSync(path.join(siteDir, d), { recursive: true });
  return { siteDir, created, skipped };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [slug] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const i = process.argv.indexOf("--root");
  const root = i > -1 ? process.argv[i + 1] : "sites";
  try {
    const r = initSite(root, slug);
    console.log(JSON.stringify(r, null, 2));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
