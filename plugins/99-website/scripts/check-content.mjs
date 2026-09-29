#!/usr/bin/env node
// Content rules for page JSON files, before the build.
//   node check-content.mjs sites/<slug> [--never "cheapest,tree removal"]
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { kwIndex } from "./lib/keyword.mjs";

const KEYWORD_TYPES = new Set(["home", "service", "area", "blog"]);
const words = (s) => s.toLowerCase().replace(/[^a-z0-9$ ]+/g, " ").split(/\s+/).filter(Boolean);
const grams = (s) => { const w = words(s); const g = new Set(); for (let i = 0; i + 2 < w.length; i++) g.add(w.slice(i, i + 3).join(" ")); return g; };
export function similarity(a, b) {
  const A = grams(a); const B = grams(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return inter / (A.size + B.size - inter);
}
const allText = (c) => JSON.stringify(c);
const bodyText = (c) => [c.intro, ...(c.sections || []).flatMap((s) => [s.h2, ...(s.paragraphs || []), ...(s.bullets || [])])].filter(Boolean).join(" ");
const idOf = (p) => (p.url === "/" ? "home" : p.slug);

export function checkContent({ site, contents, never = [] }) {
  const errors = [];
  const warnings = [];
  const err = (url, field, message) => errors.push({ url, field, message });
  const services = new Set(site.pages.filter((p) => p.type === "service").map((p) => p.url));
  for (const p of site.pages) {
    const c = contents[idOf(p)];
    if (!c) { err(p.url, "file", `missing src/content/pages/${idOf(p)}.json`); continue; }
    for (const f of ["h1", "description", "intro"]) if (!c[f]) err(p.url, f, "required");
    if (KEYWORD_TYPES.has(p.type) && p.keyword && c.h1 && kwIndex(c.h1, p.keyword) < 0) err(p.url, "h1", `"${c.h1}" does not contain the keyword "${p.keyword}"`);
    if (c.description && (c.description.length < 70 || c.description.length > 160)) err(p.url, "description", `${c.description.length} characters, want 70 to 160`);
    const t = allText(c);
    if (t.includes("\u2014")) err(p.url, "text", "contains an em dash");
    if (/\[NEEDS INPUT/i.test(t)) err(p.url, "text", "contains [NEEDS INPUT]");
    if (/lorem ipsum/i.test(t)) err(p.url, "text", "contains lorem ipsum");
    // Whole words only: "eco" must not match "recommend" or "second".
    for (const n of never) if (n && new RegExp(`\\b${n.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(t.toLowerCase())) err(p.url, "text", `uses a never-say phrase: "${n}"`);
    if (p.type === "service") {
      const s = (c.steps || []).length; const q = (c.faqs || []).length;
      if (s < 3 || s > 5) err(p.url, "steps", `${s} steps, want 3 to 5`);
      if (q < 3 || q > 6) err(p.url, "faqs", `${q} FAQs, want 3 to 6`);
      if (!c.price) warnings.push({ url: p.url, field: "price", message: "no price signal (fine only if the owner said no prices)" });
      for (const sec of c.sections || []) if (/^what is/i.test(sec.h2 || "")) err(p.url, "sections", `"${sec.h2}": service pages never have a "What is" section`);
      if (c.author || c.date) err(p.url, "author", "service pages have no byline or date");
    }
    if (p.type === "blog") {
      if (!services.has(c.service_link)) err(p.url, "service_link", `"${c.service_link}" is not a built service page`);
      if (!c.author || !c.date) err(p.url, "author", "blog posts need author and date");
    }
  }
  for (const type of ["service", "area"]) {
    const sib = site.pages.filter((p) => p.type === type && contents[idOf(p)]);
    for (let i = 0; i < sib.length; i++) for (let j = i + 1; j < sib.length; j++) {
      const s = similarity(bodyText(contents[idOf(sib[i])]), bodyText(contents[idOf(sib[j])]));
      if (s > 0.5) err(sib[j].url, "text", `${Math.round(s * 100)}% similar to ${sib[i].url} (max 50%)`);
    }
  }
  return { errors, warnings };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const siteDir = args.find((a) => !a.startsWith("--"));
  const ni = args.indexOf("--never");
  const never = ni > -1 ? args[ni + 1].split(",").map((s) => s.trim()) : [];
  const site = JSON.parse(fs.readFileSync(path.join(siteDir, "site/src/data/site.json"), "utf8"));
  const dir = path.join(siteDir, "site/src/content/pages");
  const contents = {};
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) if (f.endsWith(".json")) contents[f.slice(0, -5)] = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const r = checkContent({ site, contents, never });
  for (const e of r.errors) console.log(`ERROR  ${e.url} ${e.field}: ${e.message}`);
  for (const w of r.warnings) console.log(`WARN   ${w.url} ${w.field}: ${w.message}`);
  console.log(`${site.pages.length} pages, ${r.errors.length} errors, ${r.warnings.length} warnings`);
  process.exit(r.errors.length ? 1 : 0);
}
