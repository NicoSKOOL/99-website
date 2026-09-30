#!/usr/bin/env node
// Before/after Lighthouse table for the fix loop. A drop is a regression unless both scores are 99+ (run noise).
//   node compare-audits.mjs sites/<slug> <labelBefore> <labelAfter>
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const CATS = ["performance", "accessibility", "best-practices", "seo"];

export function compare(before, after) {
  const rows = [], regressions = [];
  let improved = false;
  for (const b of before.pages) {
    const a = after.pages.find((p) => p.url === b.url);
    if (!a) { regressions.push(`${b.url} not measured in the after run`); continue; }
    for (const cat of CATS) {
      const delta = a.median[cat] - b.median[cat];
      rows.push({ url: b.url, cat, before: b.median[cat], after: a.median[cat], delta });
      if (delta > 0) improved = true;
      if (delta < 0 && !(b.median[cat] >= 99 && a.median[cat] >= 99)) regressions.push(`${b.url} ${cat} ${b.median[cat]} -> ${a.median[cat]}`);
    }
  }
  return { rows, regressions, improved };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [siteDir, la, lb] = process.argv.slice(2);
  const load = (l) => JSON.parse(fs.readFileSync(path.join(siteDir, `audits/lighthouse-${l}.json`), "utf8"));
  const c = compare(load(la), load(lb));
  const lines = [`## ${la} -> ${lb} (${new Date().toISOString().slice(0, 16)})`, "", "| Page | Category | Before | After |", "|---|---|---|---|",
    ...c.rows.filter((r) => r.delta !== 0).map((r) => `| ${r.url} | ${r.cat} | ${r.before} | ${r.after} |`), "",
    c.regressions.length ? `REGRESSIONS: ${c.regressions.join("; ")}` : "No regressions.", ""];
  fs.appendFileSync(path.join(siteDir, "audits/fix-log.md"), lines.join("\n") + "\n");
  console.log(lines.join("\n"));
  process.exitCode = c.regressions.length ? 1 : 0;
}
