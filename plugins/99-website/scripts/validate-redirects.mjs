#!/usr/bin/env node
// Rebuild mode: every crawled URL needs a decision (keep, 301 to a planned page, or 410).
//   node validate-redirects.mjs --crawl research/crawl/pages.jsonl --redirects research/rebuild-redirects.csv --sitemap research/site-map.csv
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { parseCsv } from "./lib/csv.mjs";

export function validateRedirects({ crawlPaths, redirectsCsv, siteMapCsv }) {
  const errors = [];
  const planned = new Set(parseCsv(siteMapCsv).rows.map((r) => r.url));
  const { header, rows } = parseCsv(redirectsCsv);
  for (const c of ["old_url", "new_url", "status"]) {
    if (!header.includes(c)) return { errors: [{ row: 1, field: "header", message: `missing column ${c}` }] };
  }
  const byOld = new Map();
  rows.forEach((r, i) => {
    const row = i + 2;
    if (byOld.has(r.old_url)) errors.push({ row, field: "old_url", message: `${r.old_url} appears twice` });
    byOld.set(r.old_url, r);
    if (r.status === "301" || r.status === "keep") {
      if (!planned.has(r.new_url)) errors.push({ row, field: "new_url", message: `${r.new_url} is not a page in site-map.csv` });
      if (r.status === "keep" && r.old_url !== r.new_url) errors.push({ row, field: "status", message: "keep means the url stays the same" });
    } else if (r.status === "410") {
      if (r.new_url) errors.push({ row, field: "new_url", message: "410 rows have no new_url" });
    } else errors.push({ row, field: "status", message: `"${r.status}" must be 301, 410 or keep` });
  });
  rows.forEach((r, i) => {
    const next = byOld.get(r.new_url);
    if (r.status === "301" && next && next.status === "301") errors.push({ row: i + 2, field: "new_url", message: `redirect chain: ${r.old_url} -> ${r.new_url} -> ${next.new_url}. Point it straight at the final page` });
  });
  for (const p of crawlPaths) {
    if (!byOld.has(p)) errors.push({ row: 0, field: "old_url", message: `${p} has no redirect row (keep, 301 or 410)` });
  }
  return { errors };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = (n) => process.argv[process.argv.indexOf(n) + 1];
  const crawlPaths = fs.readFileSync(arg("--crawl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l).path);
  const { errors } = validateRedirects({
    crawlPaths,
    redirectsCsv: fs.readFileSync(arg("--redirects"), "utf8"),
    siteMapCsv: fs.readFileSync(arg("--sitemap"), "utf8"),
  });
  for (const e of errors) console.log(`ERROR  row ${e.row} ${e.field}: ${e.message}`);
  console.log(`${crawlPaths.length} old urls, ${errors.length} errors`);
  process.exit(errors.length ? 1 : 0);
}
