#!/usr/bin/env node
// Lighthouse on the PRODUCTION build (dist/, served by this script), mobile, median of 3 per page. 99 = all four categories.
//   node lighthouse-gate.mjs sites/<slug> [--label draft] [--all] [--runs 3] [--min 99]
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import http from "node:http";
import zlib from "node:zlib";
import { pathToFileURL } from "node:url";
import net from "node:net";

export const CATS = ["performance", "accessibility", "best-practices", "seo"];
const SKIP_MODES = new Set(["notApplicable", "manual", "informative", "error"]);

export function categoryScores(lhr, { ignore = [] } = {}) {
  const out = {};
  for (const id of CATS) {
    const cat = lhr.categories[id];
    const touched = cat.auditRefs.some((r) => ignore.includes(r.id) && r.weight > 0);
    if (!touched) { out[id] = Math.round((cat.score ?? 0) * 100); continue; }
    const refs = cat.auditRefs.filter((r) => r.weight > 0 && !ignore.includes(r.id)
      && typeof lhr.audits[r.id]?.score === "number" && !SKIP_MODES.has(lhr.audits[r.id].scoreDisplayMode));
    const w = refs.reduce((s, r) => s + r.weight, 0);
    out[id] = w ? Math.round((100 * refs.reduce((s, r) => s + r.weight * lhr.audits[r.id].score, 0)) / w) : 100;
  }
  return out;
}

export function medianScores(list) {
  const out = {};
  for (const c of CATS) {
    const v = list.map((s) => s[c]).sort((a, b) => a - b);
    out[c] = v[Math.floor(v.length / 2)];
  }
  return out;
}

export function pickPages(site, { all = false } = {}) {
  if (all) return site.pages;
  const seen = new Set();
  return site.pages.filter((p) => (seen.has(p.type) ? false : seen.add(p.type)));
}

// Any Astro site without our site.json: take the pages from the built sitemap and guess the type from the path.
const TYPE_BY_SEGMENT = { services: "service", "areas-served": "area", areas: "area", locations: "area", blog: "blog" };
export function pagesFromSitemap(xml) {
  return [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)].map((m) => {
    const url = new URL(m[1].trim()).pathname;
    const parts = url.split("/").filter(Boolean);
    let type = parts.length === 0 ? "home" : TYPE_BY_SEGMENT[parts[0]] ? (parts.length === 1 ? "hub" : TYPE_BY_SEGMENT[parts[0]]) : parts[0];
    return { url, type };
  });
}

export const gate = (results, min = 99) =>
  results.flatMap((r) => CATS.filter((c) => r.median[c] < min).map((c) => `${r.url} ${c} ${r.median[c]} (need ${min})`));

export function failingAudits(lhr, { ignore = [] } = {}) {
  const out = [];
  for (const c of CATS) for (const r of lhr.categories[c].auditRefs) {
    const a = lhr.audits[r.id];
    if (!a || ignore.includes(r.id) || SKIP_MODES.has(a.scoreDisplayMode) || typeof a.score !== "number" || a.score >= 0.9) continue;
    if (r.weight === 0 && !a.details?.overallSavingsMs) continue;
    out.push({ id: a.id, title: a.title, category: c, score: a.score, weight: r.weight, savingsMs: a.details?.overallSavingsMs ?? 0 });
  }
  return out.sort((x, y) => y.weight - x.weight || y.savingsMs - x.savingsMs);
}

const canListen = (port, host) => new Promise((resolve) => {
  const srv = net.createServer();
  srv.once("error", (e) => resolve(e.code === "EADDRNOTAVAIL" || e.code === "EAFNOSUPPORT"));
  srv.listen(port, host, () => srv.close(() => resolve(true)));
});

// A port some other server holds would get measured instead of this site: always start on a free one.
export async function freePort(start = 4322) {
  for (let p = start; p < start + 50; p++) if ((await canListen(p, "127.0.0.1")) && (await canListen(p, "::1"))) return p;
  throw new Error(`no free port from ${start}`);
}

const TYPES = { html: "text/html; charset=utf-8", css: "text/css", js: "text/javascript", json: "application/json", xml: "application/xml",
  txt: "text/plain; charset=utf-8", svg: "image/svg+xml", webp: "image/webp", avif: "image/avif", png: "image/png", jpg: "image/jpeg",
  woff2: "font/woff2", ico: "image/x-icon" };

// Serve the production build ourselves (folder/index.html, 404.html, gzip like the CDN) instead of `astro preview`,
// which in Astro 7 runs as a background daemon that can outlive this script and hold the port.
export function serveDist(dist, port) {
  const root = path.resolve(dist);
  const srv = http.createServer((req, res) => {
    let rel = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let file = path.join(root, rel);
    if (!file.startsWith(root + path.sep) && file !== root) file = "";
    else if (file && fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    const found = file && fs.existsSync(file);
    const send = found ? file : path.join(root, "404.html");
    const ext = path.extname(send).slice(1);
    let body = fs.existsSync(send) ? fs.readFileSync(send) : Buffer.from("not found");
    const headers = { "Content-Type": TYPES[ext] ?? "application/octet-stream" };
    if (/html|css|javascript|json|xml|plain|svg/.test(headers["Content-Type"]) && /gzip/.test(req.headers["accept-encoding"] ?? "")) {
      body = zlib.gzipSync(body); headers["Content-Encoding"] = "gzip";
    }
    res.writeHead(found ? 200 : 404, headers).end(body);
  });
  return new Promise((resolve) => srv.listen(port, () => resolve(srv)));
}

async function waitFor(url, ms = 30000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { try { if ((await fetch(url)).ok) return; } catch {} await new Promise((r) => setTimeout(r, 500)); }
  throw new Error(`preview server did not answer at ${url}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const siteDir = args[0];
  const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
  const label = opt("--label", new Date().toISOString().slice(0, 10));
  const runs = +opt("--runs", 3), min = +opt("--min", 99);
  const port = await freePort(4322);
  const dataFile = path.join(siteDir, "site/src/data/site.json");
  const site = fs.existsSync(dataFile) ? JSON.parse(fs.readFileSync(dataFile, "utf8"))
    : { noindex: /noindex/i.test(fs.readFileSync(path.join(siteDir, "site/dist/index.html"), "utf8").match(/<meta name="robots"[^>]*>/i)?.[0] ?? ""),
        pages: pagesFromSitemap(fs.readFileSync(path.join(siteDir, "site/dist/sitemap.xml"), "utf8")) };
  if (!fs.existsSync(dataFile)) console.log(`no site.json: ${site.pages.length} pages from dist/sitemap.xml`);
  const ignore = site.noindex ? ["is-crawlable"] : [];
  const rawDir = path.join(siteDir, "audits/lh", label);
  fs.mkdirSync(rawDir, { recursive: true });
  const server = await serveDist(path.join(siteDir, "site/dist"), port);
  try {
    await waitFor(`http://localhost:${port}/`);
    const results = [];
    for (const page of pickPages(site, { all: args.includes("--all") })) {
      const scores = [], lhrs = [];
      for (let i = 1; i <= runs; i++) {
        const out = path.join(rawDir, `${page.url === "/" ? "home" : page.url.replace(/^\/|\/$/g, "").replace(/\//g, "-")}-${i}.json`);
        // Async on purpose: a blocking call would freeze serveDist (same process) and Lighthouse would time out.
        await promisify(execFile)("npx", ["-y", "lighthouse@12", `http://localhost:${port}${page.url}`, "--quiet", "--chrome-flags=--headless=new",
          `--only-categories=${CATS.join(",")}`, "--output=json", `--output-path=${out}`], { maxBuffer: 64 * 1024 * 1024 });
        const lhr = JSON.parse(fs.readFileSync(out, "utf8"));
        lhrs.push(lhr); scores.push(categoryScores(lhr, { ignore }));
      }
      const median = medianScores(scores);
      const mid = lhrs[scores.findIndex((s) => s.performance === median.performance)];
      results.push({ url: page.url, type: page.type, runs: scores, median, failing: failingAudits(mid, { ignore }) });
      console.log(`${page.url.padEnd(40)} ${CATS.map((c) => median[c]).join(" / ")}`);
    }
    const report = { label, date: new Date().toISOString(), noindex: site.noindex, runs, min, pages: results, failures: gate(results, min) };
    fs.writeFileSync(path.join(siteDir, `audits/lighthouse-${label}.json`), JSON.stringify(report, null, 2));
    if (site.noindex) console.log("noindex build: SEO shown without the is-crawlable audit");
    for (const f of report.failures) console.log(`FAIL ${f}`);
    console.log(report.failures.length ? `\n${report.failures.length} below ${min}` : `\nall pages ${min}+ on all four categories`);
    process.exitCode = report.failures.length ? 1 : 0;
  } finally { server.close(); }
}
