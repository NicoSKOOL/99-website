import { test } from "node:test";
import assert from "node:assert/strict";
import { STEPS, nextStep, banner } from "../plugins/99-website/scripts/next-step.mjs";

const state = (rows) => `# Project state\n\n| Step | Status | Date | Notes |\n|---|---|---|---|\n${rows.map(([s, st]) => `| ${s} | ${st} | 2026-09-30 | |`).join("\n")}\n`;

test("11 steps in order", () => {
  assert.equal(STEPS.length, 11);
  assert.equal(STEPS[0], "setup-check"); assert.equal(STEPS[10], "gbp-sync");
});
test("empty state starts at setup-check", () => {
  const n = nextStep(state([]));
  assert.equal(n.step, "setup-check"); assert.equal(n.index, 0);
});
test("three done rows: next is site-design", () =>
  assert.equal(nextStep(state([["setup-check", "done"], ["business-intake", "done"], ["keyword-sitemap", "done"]])).step, "site-design"));
test("a step in progress is resumed", () =>
  assert.equal(nextStep(state([["setup-check", "done"], ["business-intake", "in progress"]])).step, "business-intake"));
test("everything done: no step", () => assert.equal(nextStep(state(STEPS.map((s) => [s, "done"]))).step, null));
test("--no-deploy stops after auto-fix", () =>
  assert.equal(nextStep(state(STEPS.slice(0, 9).map((s) => [s, "done"])), { noDeploy: true }).step, null));
test("a later step marked done never skips a missing earlier one", () =>
  assert.equal(nextStep(state([["setup-check", "done"], ["business-intake", "done"], ["keyword-sitemap", "done"], ["site-audit", "done"]])).step, "site-design"));
test("unknown rows are ignored", () => assert.equal(nextStep(state([["something-else", "done"]])).step, "setup-check"));
test("banner shows position and name", () => assert.equal(banner("site-design", 3), "[4/11] Running site-design..."));
