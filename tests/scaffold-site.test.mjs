import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { scaffoldSite } from "../plugins/99-website/scripts/scaffold-site.mjs";

function tpl() {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), "tpl-"));
  fs.mkdirSync(path.join(t, "src/pages"), { recursive: true });
  fs.mkdirSync(path.join(t, "node_modules/x"), { recursive: true });
  fs.writeFileSync(path.join(t, "package.json"), "{}");
  fs.writeFileSync(path.join(t, "src/pages/index.astro"), "hi");
  fs.writeFileSync(path.join(t, "node_modules/x/a.js"), "x");
  return t;
}

test("copies the starter into site/, skipping node_modules", () => {
  const site = fs.mkdtempSync(path.join(os.tmpdir(), "s-"));
  const r = scaffoldSite(site, tpl());
  assert.deepEqual(r.created.sort(), ["package.json", "src/pages/index.astro"]);
  assert.ok(!fs.existsSync(path.join(site, "site/node_modules")));
});

test("never overwrites a file the user edited", () => {
  const site = fs.mkdtempSync(path.join(os.tmpdir(), "s-"));
  const t = tpl();
  scaffoldSite(site, t);
  fs.writeFileSync(path.join(site, "site/src/pages/index.astro"), "edited");
  const r = scaffoldSite(site, t);
  assert.equal(fs.readFileSync(path.join(site, "site/src/pages/index.astro"), "utf8"), "edited");
  assert.ok(r.skipped.includes("src/pages/index.astro"));
});
