import { test } from "node:test";
import assert from "node:assert/strict";
import { prioritise, renderAudit } from "../plugins/99-website/scripts/audit-report.mjs";

const lh = { label: "t", noindex: true, pages: [
  { url: "/", type: "home", median: { performance: 88, accessibility: 100, "best-practices": 100, seo: 100 },
    failing: [{ id: "largest-contentful-paint", title: "LCP", category: "performance", score: 0.4, weight: 25, savingsMs: 900 }] },
  { url: "/services/a/", type: "service", median: { performance: 99, accessibility: 96, "best-practices": 100, seo: 100 },
    failing: [{ id: "color-contrast", title: "Contrast", category: "accessibility", score: 0, weight: 7, savingsMs: 0 }] },
] };

test("seo gate failures are P1 and grouped across pages", () => {
  const items = prioritise({ seo: ["/a/: title 64 characters (max 60)", "/b/: title 62 characters (max 60)"], lighthouse: lh });
  const t = items.find((i) => i.what.startsWith("title"));
  assert.equal(t.priority, 1);
  assert.equal(t.where, "2 pages: /a/, /b/");
});
test("category under 90 is P1, 90 to 98 is P2", () => {
  const items = prioritise({ seo: [], lighthouse: lh });
  assert.equal(items.find((i) => i.what.includes("performance 88")).priority, 1);
  assert.equal(items.find((i) => i.what.includes("accessibility 96")).priority, 2);
});
test("sorted P1 first and rendered as markdown with a score table", () => {
  const md = renderAudit(prioritise({ seo: [], lighthouse: lh }), lh);
  assert.match(md, /\| \/ \| 88 \| 100 \| 100 \| 100 \|/);
  assert.ok(md.indexOf("P1") < md.indexOf("P2"));
  assert.ok(!md.includes("\u2014"));
});
