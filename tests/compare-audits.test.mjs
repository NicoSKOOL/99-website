import { test } from "node:test";
import assert from "node:assert/strict";
import { compare } from "../plugins/99-website/scripts/compare-audits.mjs";

const r = (perf, a11y) => ({ pages: [{ url: "/", median: { performance: perf, accessibility: a11y, "best-practices": 100, seo: 100 } }] });

test("an improvement with no drop is improved and has no regressions", () => {
  const c = compare(r(92, 100), r(99, 100));
  assert.equal(c.improved, true);
  assert.deepEqual(c.regressions, []);
});
test("a fix that helps performance but breaks accessibility is a regression", () => {
  const c = compare(r(92, 100), r(99, 94));
  assert.deepEqual(c.regressions, ["/ accessibility 100 -> 94"]);
});
test("a 1 point wobble at 99+ is noise, not a regression", () => {
  assert.deepEqual(compare(r(100, 100), r(99, 100)).regressions, []);
});
test("a page missing from the after run is a regression", () => {
  assert.match(compare(r(99, 100), { pages: [] }).regressions.join(), /not measured/);
});
