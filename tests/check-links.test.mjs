import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { checkLinks } from "../plugins/99-website/scripts/check-links.mjs";

function dist(files) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "dist-"));
  for (const [f, html] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(d, f)), { recursive: true }); fs.writeFileSync(path.join(d, f), html); }
  return d;
}
const site = { pages: [
  { url: "/", type: "home", slug: "home", file: "index.html" },
  { url: "/services/a/", type: "service", slug: "a", file: "services/a/index.html" },
  { url: "/blog/p/", type: "blog", slug: "p", file: "blog/p/index.html" },
] };
const contents = { p: { service_link: "/services/a/" } };

test("a fully linked site passes", () => {
  const d = dist({ "index.html": '<a href="/services/a/">A</a><a href="/blog/p/">P</a>', "services/a/index.html": '<a href="/">Home</a>', "blog/p/index.html": '<a href="/services/a/">A</a>' });
  assert.deepEqual(checkLinks({ dist: d, site, contents }), []);
});
test("a link to an unbuilt (phase=later) page fails", () => {
  const d = dist({ "index.html": '<a href="/services/a/">A</a><a href="/blog/p/">P</a><a href="/blog/later/">L</a>', "services/a/index.html": "", "blog/p/index.html": '<a href="/services/a/">A</a>' });
  assert.match(checkLinks({ dist: d, site, contents }).join(), /\/blog\/later\/.*not built/);
});
test("orphans and a blog post that skips its service page fail", () => {
  const d = dist({ "index.html": '<a href="/services/a/">A</a>', "services/a/index.html": "", "blog/p/index.html": "" });
  const m = checkLinks({ dist: d, site, contents }).join("\n");
  assert.match(m, /\/blog\/p\/ is not linked from any page/);
  assert.match(m, /\/blog\/p\/ does not link to its service page/);
});
