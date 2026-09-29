#!/usr/bin/env node
// Count open "> CONFIRM:" lines and [NEEDS INPUT: ...] markers in sites/<slug>/business/*.md.
// business/notes/ is the user's raw material and is not counted.
//   node confirm-count.mjs sites/<slug>
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export function countOpen(siteDir) {
  const dir = path.join(siteDir, "business");
  const out = { confirm: 0, needs_input: 0, files: {} };
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith(".md")) continue;
    const text = fs.readFileSync(path.join(dir, name), "utf8");
    const confirm = text.split(/\r?\n/).filter((l) => /^\s*>\s*CONFIRM:/.test(l)).length;
    const needs = (text.match(/\[NEEDS INPUT:/g) || []).length;
    if (confirm || needs) out.files[name] = { confirm, needs_input: needs };
    out.confirm += confirm;
    out.needs_input += needs;
  }
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(countOpen(process.argv[2]), null, 2));
}
