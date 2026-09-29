#!/usr/bin/env node
// Internal links: every link resolves, required links exist, no orphans.
//   node check-links.mjs sites/<slug>
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { hrefs } from "./lib/html.mjs";

export function checkLinks({ dist, site, contents }) {
  const f = [];
  const built = new Set(site.pages.map((p) => p.url));
  const inbound = new Map(site.pages.map((p) => [p.url, 0]));
  const outOf = {};
  for (const p of site.pages) {
    const file = path.join(dist, p.file);
    const html = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
    const links = hrefs(html).filter((h) => h.startsWith("/") && !h.startsWith("//")).map((h) => h.split("#")[0].split("?")[0]).filter(Boolean);
    outOf[p.url] = new Set(links);
    for (const l of new Set(links)) {
      if (/\.(xml|txt|webp|avif|svg|ico|woff2?)$/i.test(l) || l.startsWith("/api/")) continue;
      if (!built.has(l)) f.push(`${p.url} links to ${l}, which is not built`);
      else if (l !== p.url) inbound.set(l, inbound.get(l) + 1);
    }
  }
  const home = outOf["/"] || new Set();
  for (const p of site.pages.filter((x) => x.type === "service")) if (!home.has(p.url)) f.push(`home does not link to ${p.url}`);
  for (const p of site.pages.filter((x) => x.type === "blog")) {
    const target = contents[p.slug]?.service_link;
    if (target && !outOf[p.url]?.has(target)) f.push(`${p.url} does not link to its service page ${target}`);
  }
  for (const [url, n] of inbound) if (url !== "/" && n === 0) f.push(`${url} is not linked from any page`);
  return f;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const siteDir = process.argv[2];
  const site = JSON.parse(fs.readFileSync(path.join(siteDir, "site/src/data/site.json"), "utf8"));
  const dir = path.join(siteDir, "site/src/content/pages");
  const contents = {};
  for (const x of fs.existsSync(dir) ? fs.readdirSync(dir) : []) if (x.endsWith(".json")) contents[x.slice(0, -5)] = JSON.parse(fs.readFileSync(path.join(dir, x), "utf8"));
  const f = checkLinks({ dist: path.join(siteDir, "site/dist"), site, contents });
  for (const m of f) console.log(`FAIL ${m}`);
  console.log(f.length ? `\n${f.length} failure(s)` : `links OK across ${site.pages.length} pages`);
  process.exit(f.length ? 1 : 0);
}
