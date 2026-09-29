import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { findSkills, readEnvKeys } from "../plugins/99-website/scripts/doctor.mjs";

function skillDir(root, rel, name) {
  const d = path.join(root, rel);
  fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, "SKILL.md"), `---\nname: ${name}\ndescription: x\n---\nbody\n`);
  return path.join(d, "SKILL.md");
}

test("findSkills finds skills by frontmatter name at any depth", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "doc-"));
  const a = skillDir(root, "plugins/cache/impeccable/4.4.0/skills/impeccable", "impeccable");
  const b = skillDir(root, "skills/taste", "design-taste-frontend");
  const found = findSkills([root], ["impeccable", "design-taste-frontend", "missing-one"]);
  assert.equal(found["impeccable"], a);
  assert.equal(found["design-taste-frontend"], b);
  assert.equal(found["missing-one"], null);
});

test("findSkills ignores roots that do not exist", () => {
  const found = findSkills(["/definitely/not/here"], ["impeccable"]);
  assert.equal(found["impeccable"], null);
});

test("readEnvKeys reports presence only, from env or .env text", () => {
  const res = readEnvKeys(["FAL_KEY", "RESEND_API_KEY", "OTHER"],
    "FAL_KEY=abc123\n# RESEND_API_KEY=commented\nEMPTY=\n", { OTHER: "x" });
  assert.deepEqual(res, { FAL_KEY: true, RESEND_API_KEY: false, OTHER: true });
});
