#!/usr/bin/env node
// Static SEO gates on the built site. Ported from ai-ranking-scroll-seo/verify-seo.mjs for multi-page local sites.
//   node verify-seo.mjs sites/<slug>
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { decode, strip } from "./lib/html.mjs";
import { kwIndex } from "./lib/keyword.mjs";

const KEYWORD_TYPES = new Set(["home", "service", "area", "blog"]);

export function verifyPage({ html, page, business, siteUrl, expectNoindex }) {
  const f = [];
  const title = decode((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || "").trim();
  const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => strip(m[1]));
  const desc = decode((html.match(/<meta name="description" content="([^"]*)"/i) || [])[1] || "");
  const canon = (html.match(/<link rel="canonical" href="([^"]+)"/i) || [])[1] || "";
  const visible = strip(html);
  if (h1s.length !== 1) f.push(`${h1s.length} <h1> elements (need exactly 1)`);
  if (KEYWORD_TYPES.has(page.type) && page.keyword) {
    const at = kwIndex(title, page.keyword);
    if (at < 0) f.push(`keyword "${page.keyword}" not in title "${title}"`);
    else if (at > title.length / 2) f.push("keyword is in the second half of the title (want the first half)");
    if (h1s[0] && kwIndex(h1s[0], page.keyword) < 0) f.push(`keyword not in h1 "${h1s[0]}"`);
  }
  if ([...title].length > 60) f.push(`title ${[...title].length} characters (max 60)`);
  if (desc.length < 70 || desc.length > 160) f.push(`meta description ${desc.length} characters (want 70 to 160)`);
  if (canon !== `${siteUrl}${page.url}`) f.push(`canonical "${canon}" should be "${siteUrl}${page.url}"`);
  const hasNoindex = /<meta name="robots" content="[^"]*noindex/i.test(html);
  if (hasNoindex !== expectNoindex) f.push(expectNoindex ? "noindex missing on a noindex build" : "noindex present on an indexable build");
  for (const m of html.matchAll(/<(img|source)\b([^>]*)>/gi)) {
    const attrs = m[2];
    const urls = [...attrs.matchAll(/(?:src|srcset)="([^"]+)"/g)].flatMap((x) => x[1].split(",").map((s) => s.trim().split(" ")[0]));
    for (const u of urls) if (!/\.(webp|avif|svg)(\?|$)/i.test(u) && !u.startsWith("data:")) f.push(`non-WebP image ${u}`);
    if (m[1].toLowerCase() === "img") {
      if (!/\bwidth="\d+"/.test(attrs) || !/\bheight="\d+"/.test(attrs)) f.push(`img without width/height: ${attrs.slice(0, 60)}`);
      if (!/\balt(="|\s|\/|$)/.test(attrs)) f.push(`img without alt: ${attrs.slice(0, 60)}`);
    }
  }
  if (visible.includes("\u2014")) f.push("em dash in visible text");
  if (/\[NEEDS INPUT/i.test(visible)) f.push("[NEEDS INPUT] in visible text");
  if (business.phone && !visible.includes(business.phone)) f.push(`business phone "${business.phone}" not on the page`);
  if (business.name && !visible.includes(business.name)) f.push(`business name "${business.name}" not on the page (NAP)`);
  let last = 0;
  for (const m of html.matchAll(/<h([1-6])\b/gi)) {
    const lvl = +m[1];
    if (last && lvl > last + 1) f.push(`heading jumps from h${last} to h${lvl}`);
    last = lvl;
  }
  return f;
}

export function verifySite({ dist, site }) {
  const failures = [];
  for (const page of site.pages) {
    const file = path.join(dist, page.file);
    if (!fs.existsSync(file)) { failures.push(`${page.url}: not built (${page.file})`); continue; }
    for (const m of verifyPage({ html: fs.readFileSync(file, "utf8"), page, business: site.business, siteUrl: site.site_url, expectNoindex: site.noindex })) failures.push(`${page.url}: ${m}`);
  }
  for (const f of ["robots.txt", "sitemap.xml", "llms.txt", "_headers", "404.html"]) if (!fs.existsSync(path.join(dist, f))) failures.push(`site: missing ${f}`);
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  for (const f of walk(dist)) if (/\.(png|jpe?g|gif)$/i.test(f) && !/favicon|apple-touch/i.test(f)) failures.push(`site: raster image shipped ${path.relative(dist, f)}`);
  return { failures };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const siteDir = process.argv[2];
  const site = JSON.parse(fs.readFileSync(path.join(siteDir, "site/src/data/site.json"), "utf8"));
  const { failures } = verifySite({ dist: path.join(siteDir, "site/dist"), site });
  for (const f of failures) console.log(`FAIL ${f}`);
  console.log(failures.length ? `\n${failures.length} failure(s)` : `all SEO gates pass (${site.pages.length} pages)`);
  process.exit(failures.length ? 1 : 0);
}
