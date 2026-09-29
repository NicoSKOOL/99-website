import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { initSite } from "../plugins/99-website/scripts/site-init.mjs";

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "init-"));

test("creates the full site tree from templates", () => {
  const root = tmp();
  const { siteDir, created } = initSite(root, "my-inclusion");
  for (const rel of ["business/client.md", "business/services.md", "business/areas.md", "business/proof.md",
    "business/brand-voice.md", "business/competitors.md", "business/notes/README.md",
    "logs/project-state.md", "logs/decision-log.md", "logs/approval-log.md"]) {
    assert.ok(fs.existsSync(path.join(siteDir, rel)), rel);
  }
  for (const dir of ["business/photos", "research", "design/references", "site", "audits"]) {
    assert.ok(fs.statSync(path.join(siteDir, dir)).isDirectory(), dir);
  }
  assert.ok(created.length >= 10);
});

test("never overwrites a file the user already edited", () => {
  const root = tmp();
  const { siteDir } = initSite(root, "acme");
  const f = path.join(siteDir, "business/client.md");
  fs.writeFileSync(f, "hand edited");
  const second = initSite(root, "acme");
  assert.equal(fs.readFileSync(f, "utf8"), "hand edited");
  assert.ok(second.skipped.includes("business/client.md"));
});

test("rejects slugs that are not lowercase-hyphen", () => {
  assert.throws(() => initSite(tmp(), "My Inclusion"), /invalid slug/);
  assert.throws(() => initSite(tmp(), "../escape"), /invalid slug/);
});
