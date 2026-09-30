#!/usr/bin/env node
// Lighthouse on the PRODUCTION build (astro preview), mobile, median of 3 per page. 99 = all four categories.
//   node lighthouse-gate.mjs sites/<slug> [--label draft] [--all] [--runs 3] [--min 99]
import fs from "node:fs";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

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
  const runs = +opt("--runs", 3), min = +opt("--min", 99), port = 4322;
  const site = JSON.parse(fs.readFileSync(path.join(siteDir, "site/src/data/site.json"), "utf8"));
  const ignore = site.noindex ? ["is-crawlable"] : [];
  const rawDir = path.join(siteDir, "audits/lh", label);
  fs.mkdirSync(rawDir, { recursive: true });
  const server = spawn("npx", ["astro", "preview", "--port", String(port)], { cwd: path.join(siteDir, "site"), stdio: "ignore" });
  try {
    await waitFor(`http://localhost:${port}/`);
    const results = [];
    for (const page of pickPages(site, { all: args.includes("--all") })) {
      const scores = [], lhrs = [];
      for (let i = 1; i <= runs; i++) {
        const out = path.join(rawDir, `${page.url === "/" ? "home" : page.url.replace(/^\/|\/$/g, "").replace(/\//g, "-")}-${i}.json`);
        execFileSync("npx", ["-y", "lighthouse@12", `http://localhost:${port}${page.url}`, "--quiet", "--chrome-flags=--headless=new",
          `--only-categories=${CATS.join(",")}`, "--output=json", `--output-path=${out}`], { stdio: "ignore" });
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
  } finally { server.kill(); }
}
