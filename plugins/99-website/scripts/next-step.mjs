#!/usr/bin/env node
// Which step runs next? Reads logs/project-state.md. The first step not marked "done" is next, in STEPS order,
// so a step marked done out of order never lets an earlier missing one be skipped.
//   node next-step.mjs sites/<slug> [--no-deploy]
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const STEPS = ["setup-check", "business-intake", "keyword-sitemap", "site-design", "site-images", "astro-build",
  "seo-foundation", "site-audit", "auto-fix", "deploy-and-connect", "gbp-sync"];
const NO_DEPLOY_END = STEPS.indexOf("auto-fix");

export function nextStep(stateMd, { noDeploy = false } = {}) {
  const status = new Map();
  for (const m of stateMd.matchAll(/^\|\s*([a-z0-9-]+)\s*\|\s*([^|]*?)\s*\|/gm)) status.set(m[1], m[2].toLowerCase());
  const last = noDeploy ? NO_DEPLOY_END : STEPS.length - 1;
  const done = STEPS.filter((s) => status.get(s) === "done");
  for (let i = 0; i <= last; i++) if (status.get(STEPS[i]) !== "done") return { step: STEPS[i], index: i, done };
  return { step: null, index: -1, done };
}

export const banner = (step, index) => `[${index + 1}/${STEPS.length}] Running ${step}...`;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const siteDir = process.argv[2];
  const file = path.join(siteDir, "logs/project-state.md");
  const n = nextStep(fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "", { noDeploy: process.argv.includes("--no-deploy") });
  console.log(n.step ? banner(n.step, n.index) : `All steps done (${n.done.length}/${STEPS.length}).`);
}
