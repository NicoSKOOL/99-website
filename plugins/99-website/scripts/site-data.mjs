#!/usr/bin/env node
// Turn the approved plan into build data. The Astro site reads ONLY site.json.
//   node site-data.mjs sites/<slug> [--site-url https://x] [--index]
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseCsv } from "./lib/csv.mjs";

export function parseFrontMatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const out = {};
  if (!m) return out;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-z0-9_]+):\s*(.*)$/i);
    if (!kv) continue;
    out[kv[1]] = kv[2].replace(/\s+#.*$/, "").trim();
  }
  return out;
}

export const pageFile = (url) => (url === "/" ? "index.html" : `${url.replace(/^\//, "")}index.html`);

// Footer order. Only profiles the owner gave (https URLs) are shown; they also become schema sameAs.
export const SOCIAL_NETWORKS = [
  ["facebook", "Facebook"], ["instagram", "Instagram"], ["youtube", "YouTube"], ["tiktok", "TikTok"],
  ["linkedin", "LinkedIn"], ["x", "X"], ["pinterest", "Pinterest"], ["nextdoor", "Nextdoor"],
  ["houzz", "Houzz"], ["yelp", "Yelp"],
];
const isUrl = (v) => /^https:\/\/\S+$/.test(v || "");

export function buildSiteData({ siteMapCsv, clientMd, siteUrl, index = false, testimonials = [] }) {
  const fm = parseFrontMatter(clientMd);
  const rows = parseCsv(siteMapCsv).rows.filter((r) => r.phase === "now");
  const pages = rows.map((r) => ({
    url: r.url, slug: r.slug, type: r.page_type, page_name: r.page_name, title: r.title_tag,
    keyword: r.target_keyword, parent: r.parent, intent: r.intent, file: pageFile(r.url),
  }));
  const pick = (type) => pages.filter((p) => p.type === type).map((p) => ({ url: p.url, name: p.page_name }));
  return {
    site_url: siteUrl.replace(/\/$/, ""),
    noindex: !index,
    business: {
      name: fm.business_name || "", phone: fm.phone || "", email: fm.email || "", hours: fm.hours || "",
      home_city: fm.home_city || "", country: fm.country || "", location_code: fm.location_code || "",
      primary_cta: fm.primary_cta || "form", domain: fm.domain || "",
      demo: /FICTIONAL demo business/i.test(clientMd), sensitive: fm.sensitive_niche === "true",
      founded: fm.founded || "", turnstile_site_key: fm.turnstile_site_key || "",
      trust_points: (fm.trust_points || "").split("|").map((s) => s.trim()).filter(Boolean),
      gbp_url: isUrl(fm.gbp_url) ? fm.gbp_url : "",
      socials: SOCIAL_NETWORKS.filter(([k]) => isUrl(fm[k])).map(([network, label]) => ({ network, label, url: fm[network] })),
    },
    // Never invented: a quote without a source (review link, email, owner answer) is not built.
    testimonials: testimonials.filter((t) => t.quote && t.name && t.source),
    pages,
    nav: { services: pick("service"), areas: pick("area") },
  };
}

export function redirectLines(redirectsCsv) {
  return parseCsv(redirectsCsv).rows.filter((r) => r.status === "301").map((r) => `${r.old_url} ${r.new_url} 301`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const siteDir = args.find((a) => !a.startsWith("--"));
  const i = args.indexOf("--site-url");
  const siteUrl = i > -1 ? args[i + 1] : "http://localhost:4321";
  if (!siteDir) { console.error("usage: node site-data.mjs sites/<slug> [--site-url URL] [--index]"); process.exit(1); }
  const tf = path.join(siteDir, "business/testimonials.json");
  const data = buildSiteData({
    siteMapCsv: fs.readFileSync(path.join(siteDir, "research/site-map.csv"), "utf8"),
    clientMd: fs.readFileSync(path.join(siteDir, "business/client.md"), "utf8"),
    siteUrl, index: args.includes("--index"),
    testimonials: fs.existsSync(tf) ? JSON.parse(fs.readFileSync(tf, "utf8")) : [],
  });
  const dropped = fs.existsSync(tf) ? JSON.parse(fs.readFileSync(tf, "utf8")).length - data.testimonials.length : 0;
  if (dropped) console.log(`${dropped} testimonial(s) skipped: no source`);
  const out = path.join(siteDir, "site/src/data/site.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(data, null, 2) + "\n");
  const rf = path.join(siteDir, "research/rebuild-redirects.csv");
  const lines = fs.existsSync(rf) ? redirectLines(fs.readFileSync(rf, "utf8")) : [];
  fs.mkdirSync(path.join(siteDir, "site/public"), { recursive: true });
  fs.writeFileSync(path.join(siteDir, "site/public/_redirects"), lines.join("\n") + (lines.length ? "\n" : ""));
  console.log(`${data.pages.length} pages, ${lines.length} redirects, ${data.testimonials.length} testimonials, ${data.business.socials.length} socials, noindex=${data.noindex}, demo=${data.business.demo}`);
}
