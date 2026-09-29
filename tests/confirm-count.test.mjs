import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { countOpen } from "../plugins/99-website/scripts/confirm-count.mjs";

test("counts CONFIRM lines and NEEDS INPUT markers in business files only", () => {
  const site = fs.mkdtempSync(path.join(os.tmpdir(), "cc-"));
  fs.mkdirSync(path.join(site, "business/notes"), { recursive: true });
  fs.writeFileSync(path.join(site, "business/client.md"),
    "- Phone: 03 1234\n> CONFIRM: phone differs from GBP\n  > CONFIRM: address missing\nPrice: [NEEDS INPUT: price range]\n");
  fs.writeFileSync(path.join(site, "business/proof.md"), "Nothing to confirm. The word CONFIRM: mid-line does not count.\n");
  fs.writeFileSync(path.join(site, "business/notes/old.md"), "> CONFIRM: this is a user note, ignore\n");
  const res = countOpen(site);
  assert.equal(res.confirm, 2);
  assert.equal(res.needs_input, 1);
  assert.deepEqual(res.files["client.md"], { confirm: 2, needs_input: 1 });
  assert.equal(res.files["old.md"], undefined);
});
