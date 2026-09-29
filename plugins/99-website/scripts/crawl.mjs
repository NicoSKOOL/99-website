#!/usr/bin/env node
// Crawl an existing site for rebuild mode. Zero dependencies.
//   node crawl.mjs https://example.com --out sites/<slug>/research/crawl [--limit 150]
// Writes pages.jsonl (one page per line) and summary.json. Exit 2 if most pages are blocked.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";
// Profile hosts for rebuild intake. Share/intent links are not profiles.
const SOCIAL_HOST = /(^|\.)(facebook|instagram|youtube|tiktok|linkedin|x|twitter|pinterest|nextdoor|houzz|yelp)\.com$/i;
const SHARE_PATH = /\/(sharer|share|intent|dialog|pin\/create|shareArticle)/i;
const SKIP_EXT = /\.(jpe?g|png|gif|webp|avif|svg|pdf|zip|mp4|mp3|xml|txt|css|js|ico|woff2?)$/i;

const ENTITIES = { nbsp: " ", amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", ldquo: "“", rdquo: "”",
  lsquo: "‘", rsquo: "’", ndash: "-", mdash: "-", hellip: "...", rarr: "→", larr: "←", copy: "©", reg: "®", trade: "™" };
// One pass, so "&amp;lt;" becomes "&lt;" and is not decoded twice.
const decode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === "#") {
    const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1));
    return n === 8212 || n === 8211 ? "-" : String.fromCodePoint(n);
  }
  return ENTITIES[e.toLowerCase()] ?? m;
});
const clean = (s) => decode(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return m ? decode(m[1] ?? m[2] ?? m[3]) : null;
};
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map((m) => m[0]);
const inner = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, "gi"))].map((m) => clean(m[1])).filter(Boolean);

function schemaTypes(node, out) {
  if (Array.isArray(node)) return node.forEach((n) => schemaTypes(n, out));
  if (!node || typeof node !== "object") return;
  const t = node["@type"];
  if (t) (Array.isArray(t) ? t : [t]).forEach((x) => out.add(String(x)));
  for (const v of Object.values(node)) if (typeof v === "object") schemaTypes(v, out);
}

export function extractPage(html, url) {
  const u = new URL(url);
  const meta = (key) => {
    const tag = tags(html, "meta").find((t) => (attr(t, "name") || attr(t, "property") || "").toLowerCase() === key);
    return tag ? (attr(tag, "content") || "").trim() : "";
  };
  const canonTag = tags(html, "link").find((t) => (attr(t, "rel") || "").toLowerCase() === "canonical");
  const jsonldRaw = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1].trim());
  const types = new Set();
  for (const raw of jsonldRaw) { try { schemaTypes(JSON.parse(raw), types); } catch {} }
  const hrefs = tags(html, "a").map((t) => attr(t, "href")).filter(Boolean);
  const internal = new Set();
  for (const h of hrefs) {
    if (/^(tel|mailto|javascript):/i.test(h) || h.startsWith("#")) continue;
    try {
      const l = new URL(h, u);
      if (l.host === u.host && !SKIP_EXT.test(l.pathname)) internal.add(l.pathname);
    } catch {}
  }
  const imgs = tags(html, "img");
  // Menus and footers repeat on every page and would eat the 6000-character text budget.
  const body = html.replace(/<(script|style|noscript|svg|template|header|nav|footer)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<head\b[\s\S]*?<\/head>/i, " ");
  const text = clean(body);
  return {
    url: u.href,
    path: u.pathname,
    title: inner(html, "title")[0] || "",
    meta_description: meta("description"),
    canonical: canonTag && attr(canonTag, "href") ? new URL(attr(canonTag, "href"), u).href : "",
    noindex: /noindex/i.test(meta("robots")),
    h1: inner(html, "h1"), h2: inner(html, "h2"), h3: inner(html, "h3"),
    word_count: text ? text.split(" ").length : 0,
    text: text.slice(0, 6000),
    jsonld_types: [...types],
    jsonld_raw: jsonldRaw,
    tel: [...new Set(hrefs.filter((h) => /^tel:/i.test(h)).map((h) => h.slice(4).replace(/\s+/g, "")))],
    mailto: [...new Set(hrefs.filter((h) => /^mailto:/i.test(h)).map((h) => h.slice(7).split("?")[0]))],
    internal_links: [...internal],
    socials: [...new Set(hrefs.filter((h) => {
      try { const l = new URL(h, u); return SOCIAL_HOST.test(l.hostname) && !SHARE_PATH.test(l.pathname) && l.pathname.length > 1; } catch { return false; }
    }))],
    images: imgs.length,
    images_missing_alt: imgs.filter((t) => !(attr(t, "alt") || "").trim()).length,
  };
}

export function parseSitemap(xml) {
  const locs = [...xml.matchAll(/<loc>\s*([\s\S]*?)\s*<\/loc>/gi)].map((m) => decode(m[1].trim()));
  return { isIndex: /<sitemapindex/i.test(xml), locs };
}

async function get(url, fetchImpl) {
  try {
    const res = await fetchImpl(url, { headers: { "user-agent": UA, accept: "text/html,application/xml;q=0.9,*/*;q=0.8" }, redirect: "follow", signal: AbortSignal.timeout(20000) });
    return { status: res.status, url: res.url || url, type: res.headers.get("content-type") || "", text: res.ok ? await res.text() : "" };
  } catch (e) {
    return { status: 0, url, type: "", text: "", error: e.message };
  }
}

async function discover(origin, fetchImpl) {
  const robots = await get(`${origin}/robots.txt`, fetchImpl);
  const starts = [...robots.text.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1]);
  starts.push(`${origin}/sitemap_index.xml`, `${origin}/sitemap.xml`, `${origin}/wp-sitemap.xml`);
  const pages = new Set();
  const seen = new Set();
  const queue = [...new Set(starts)];
  while (queue.length && seen.size < 60) {
    const sm = queue.shift();
    if (seen.has(sm)) continue;
    seen.add(sm);
    const r = await get(sm, fetchImpl);
    if (r.status !== 200 || !/<(urlset|sitemapindex)/i.test(r.text)) continue;
    const { isIndex, locs } = parseSitemap(r.text);
    for (const loc of locs) {
      if (isIndex) queue.push(loc);
      else {
        try {
          const u = new URL(loc);
          if (u.host === new URL(origin).host && !SKIP_EXT.test(u.pathname)) pages.add(u.origin + u.pathname);
        } catch {}
      }
    }
    if (pages.size) break; // first working sitemap tree wins
  }
  return [...pages];
}

export async function crawlSite(startUrl, { limit = 150, concurrency = 4, fetchImpl = fetch } = {}) {
  const origin = new URL(startUrl).origin;
  let urls = await discover(origin, fetchImpl);
  let source = "sitemap";
  const pages = [];
  const blocked = [];
  const errors = [];
  const done = new Set();

  const visit = async (url) => {
    if (done.has(url)) return null;
    done.add(url);
    const r = await get(url, fetchImpl);
    if (r.error) { errors.push({ url, message: r.error }); return null; }
    if (r.status !== 200) { blocked.push({ url, status: r.status }); return null; }
    if (!/html/i.test(r.type)) return null;
    const p = extractPage(r.text, r.url);
    pages.push(p);
    return p;
  };

  if (!urls.length) {
    source = "links";
    const home = await visit(`${origin}/`);
    urls = home ? home.internal_links.map((p) => origin + p) : [];
  }
  const queue = urls.filter((u) => !done.has(u)).slice(0, limit);
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (queue.length && pages.length < limit) await visit(queue.shift());
  }));
  return { source, pages, blocked, errors };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const url = args.find((a) => /^https?:\/\//.test(a));
  const out = args[args.indexOf("--out") + 1];
  const limit = args.includes("--limit") ? Number(args[args.indexOf("--limit") + 1]) : 150;
  if (!url || !args.includes("--out")) { console.error("usage: node crawl.mjs <url> --out <dir> [--limit 150]"); process.exit(1); }
  const r = await crawlSite(url, { limit });
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, "pages.jsonl"), r.pages.map((p) => JSON.stringify(p)).join("\n") + "\n");
  const summary = { start_url: url, source: r.source, crawled: r.pages.length, blocked: r.blocked, errors: r.errors, crawled_at: new Date().toISOString() };
  fs.writeFileSync(path.join(out, "summary.json"), JSON.stringify(summary, null, 2));
  console.log(`crawled ${r.pages.length} pages from ${r.source}, ${r.blocked.length} blocked, ${r.errors.length} errors`);
  const attempted = r.pages.length + r.blocked.length + r.errors.length;
  if (attempted && (r.blocked.length + r.errors.length) / attempted > 0.5) {
    console.error("Most pages were blocked. The site is refusing automated fetching: read key pages in the browser instead.");
    process.exit(2);
  }
}
