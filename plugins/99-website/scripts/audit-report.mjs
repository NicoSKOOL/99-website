#!/usr/bin/env node
// One prioritised audit from the three SEO gates plus Lighthouse. Grouped by failure, not by page.
//   node audit-report.mjs sites/<slug> --label <label>   (reads audits/lighthouse-<label>.json)
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { verifySite } from "./verify-seo.mjs";
import { validateJsonLd } from "./validate-jsonld.mjs";
import { checkLinks } from "./check-links.mjs";

const CATS = ["performance", "accessibility", "best-practices", "seo"];
const HINTS = {
  "largest-contentful-paint": "hero image: preload it, fetchpriority=high, a smaller mobile size, below-fold images lazy",
  "color-contrast": "darken the text token in global.css; compute the WCAG ratio, never estimate",
  "unused-css-rules": "check Tailwind is not shipping a whole plugin; keep inline styles",
  "render-blocking-resources": "fonts: preload the one WOFF2 used above the fold, font-display swap",
  "uses-responsive-images": "add a smaller srcset width and a matching sizes attribute so phones get a phone-sized file",
  "cumulative-layout-shift": "every img needs width and height; reserve space for the form",
};

export function prioritise({ seo, lighthouse }) {
  const groups = new Map();
  for (const line of seo) {
    const [where, ...rest] = line.split(": ");
    const what = rest.join(": ").replace(/\d+ characters/, "too long");
    const g = groups.get(what) ?? { priority: 1, area: "seo gates", what, pages: [], fixHint: "fix in the content JSON or the template, rebuild, re-run the gates" };
    g.pages.push(where); groups.set(what, g);
  }
  for (const p of lighthouse.pages) {
    for (const c of CATS) if (p.median[c] < 99) {
      const what = `${c} ${p.median[c]} on the ${p.type} template`;
      groups.set(what, { priority: p.median[c] < 90 ? 1 : 2, area: "lighthouse", what, pages: [p.url], fixHint: "see the failing audits below" });
    }
    for (const a of p.failing) {
      const what = `${a.category}: ${a.title}`;
      const g = groups.get(what) ?? { priority: a.weight >= 5 ? 2 : 3, area: "lighthouse audit", what, pages: [], fixHint: HINTS[a.id] ?? "read the audit in the raw Lighthouse JSON" };
      g.pages.push(p.url); groups.set(what, g);
    }
  }
  return [...groups.values()]
    .map(({ pages, ...g }) => ({ ...g, where: pages.length > 1 ? `${pages.length} pages: ${pages.join(", ")}` : pages[0] }))
    .sort((a, b) => a.priority - b.priority);
}

export function renderAudit(items, lighthouse) {
  const rows = lighthouse.pages.map((p) => `| ${p.url} | ${CATS.map((c) => p.median[c]).join(" | ")} |`);
  const list = items.map((i) => `- **P${i.priority}** ${i.what} (${i.where}). Fix: ${i.fixHint}`);
  return [`# Site audit: ${lighthouse.label}`, "",
    "Lighthouse mobile, median of 3, production build." + (lighthouse.noindex ? " Noindex build: SEO shown without the is-crawlable audit." : ""), "",
    "| Page | Performance | Accessibility | Best Practices | SEO |", "|---|---|---|---|---|", ...rows, "",
    `## What to fix (${items.length})`, "", ...(list.length ? list : ["Nothing. Every page is 99+ and every SEO gate passes."]), ""].join("\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [siteDir] = process.argv.slice(2);
  const label = process.argv.includes("--label") ? process.argv[process.argv.indexOf("--label") + 1] : new Date().toISOString().slice(0, 10);
  const dataFile = path.join(siteDir, "site/src/data/site.json");
  const seo = [];
  if (fs.existsSync(dataFile)) {
    const site = JSON.parse(fs.readFileSync(dataFile, "utf8"));
    const dist = path.join(siteDir, "site/dist");
    const contentsDir = path.join(siteDir, "site/src/content/pages");
    const contents = Object.fromEntries(fs.readdirSync(contentsDir).filter((f) => f.endsWith(".json")).map((f) => [f.replace(/\.json$/, ""), JSON.parse(fs.readFileSync(path.join(contentsDir, f), "utf8"))]));
    seo.push(...verifySite({ dist, site }).failures);
    for (const page of site.pages) {
      const file = path.join(dist, page.file);
      if (fs.existsSync(file)) for (const m of validateJsonLd({ html: fs.readFileSync(file, "utf8"), page, business: site.business })) seo.push(`${page.url}: ${m}`);
    }
    seo.push(...checkLinks({ dist, site, contents }));
  } else console.log("no site.json (not a 99-website build): SEO gates skipped, Lighthouse only");
  const lighthouse = JSON.parse(fs.readFileSync(path.join(siteDir, `audits/lighthouse-${label}.json`), "utf8"));
  const items = prioritise({ seo, lighthouse });
  fs.writeFileSync(path.join(siteDir, `audits/audit-${label}.md`), renderAudit(items, lighthouse));
  for (const i of items.slice(0, 10)) console.log(`P${i.priority} ${i.what} (${i.where})`);
  console.log(`\n${items.length} item(s). Full list: audits/audit-${label}.md`);
}
