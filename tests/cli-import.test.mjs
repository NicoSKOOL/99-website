import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const dir = path.resolve("plugins/99-website/scripts");
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".mjs"))) {
  test(`${f} can be imported from node -e without running its CLI`, () => {
    execFileSync(process.execPath, ["-e", `import(${JSON.stringify(path.join(dir, f))})`], { stdio: "pipe" });
    assert.ok(true);
  });
}
