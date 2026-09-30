import { test } from "node:test";
import assert from "node:assert/strict";
import { categoryScores, medianScores, pickPages, gate, failingAudits } from "../plugins/99-website/scripts/lighthouse-gate.mjs";

const lhr = (o = {}) => ({
  categories: {
    performance: { score: 0.99, auditRefs: [{ id: "lcp", weight: 25 }] },
    accessibility: { score: 1, auditRefs: [] },
    "best-practices": { score: 1, auditRefs: [] },
    seo: { score: 0.69, auditRefs: [{ id: "is-crawlable", weight: 4.043 }, { id: "document-title", weight: 1 }, { id: "meta-description", weight: 1 }] },
  },
  audits: {
    lcp: { id: "lcp", title: "LCP", score: o.lcp ?? 0.97, scoreDisplayMode: "numeric", details: { overallSavingsMs: 300 } },
    "is-crawlable": { id: "is-crawlable", title: "Page is blocked from indexing", score: 0, scoreDisplayMode: "binary" },
    "document-title": { id: "document-title", title: "Title", score: 1, scoreDisplayMode: "binary" },
    "meta-description": { id: "meta-description", title: "Desc", score: 1, scoreDisplayMode: "binary" },
  },
});

test("scores are the category scores as ints", () => {
  assert.deepEqual(categoryScores(lhr()), { performance: 99, accessibility: 100, "best-practices": 100, seo: 69 });
});
test("noindex build: seo recomputed without is-crawlable", () => {
  assert.equal(categoryScores(lhr(), { ignore: ["is-crawlable"] }).seo, 100);
});
test("median of three ignores one slow run", () => {
  const s = (p) => ({ performance: p, accessibility: 100, "best-practices": 100, seo: 100 });
  assert.equal(medianScores([s(99), s(81), s(100)]).performance, 99);
});
test("pickPages takes home plus one page per type, in plan order", () => {
  const site = { pages: [{ url: "/", type: "home" }, { url: "/a/", type: "service" }, { url: "/b/", type: "service" }, { url: "/c/", type: "blog" }] };
  assert.deepEqual(pickPages(site, {}).map((p) => p.url), ["/", "/a/", "/c/"]);
  assert.equal(pickPages(site, { all: true }).length, 4);
});
test("gate lists every category under the minimum", () => {
  const f = gate([{ url: "/", median: { performance: 97, accessibility: 100, "best-practices": 100, seo: 100 } }], 99);
  assert.deepEqual(f, ["/ performance 97 (need 99)"]);
});
test("failingAudits returns weighted audits under 0.9 with savings", () => {
  const f = failingAudits(lhr({ lcp: 0.5 }), { ignore: ["is-crawlable"] });
  assert.deepEqual(f.map((a) => a.id), ["lcp"]);
  assert.equal(f[0].savingsMs, 300);
});

import { pagesFromSitemap } from "../plugins/99-website/scripts/lighthouse-gate.mjs";
test("any Astro site: pages come from dist/sitemap.xml, typed by path", () => {
  const xml = `<urlset><url><loc>https://x.dev/</loc></url><url><loc>https://x.dev/services/paver-patios/</loc></url>
<url><loc>https://x.dev/services/</loc></url><url><loc>https://x.dev/blog/cost/</loc></url><url><loc>https://x.dev/about/</loc></url></urlset>`;
  assert.deepEqual(pagesFromSitemap(xml).map((p) => `${p.url} ${p.type}`),
    ["/ home", "/services/paver-patios/ service", "/services/ hub", "/blog/cost/ blog", "/about/ about"]);
});

import net from "node:net";
import { freePort } from "../plugins/99-website/scripts/lighthouse-gate.mjs";
test("freePort skips a port that is already taken", async () => {
  const srv = net.createServer().listen(0, "127.0.0.1");
  await new Promise((r) => srv.once("listening", r));
  const taken = srv.address().port;
  const got = await freePort(taken);
  srv.close();
  assert.notEqual(got, taken);
  assert.ok(got > taken);
});

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { serveDist } from "../plugins/99-website/scripts/lighthouse-gate.mjs";
test("serveDist serves index.html per folder, types, and 404.html for missing pages", async () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "dist-"));
  fs.mkdirSync(path.join(d, "services/x"), { recursive: true });
  fs.writeFileSync(path.join(d, "index.html"), "home");
  fs.writeFileSync(path.join(d, "services/x/index.html"), "svc");
  fs.writeFileSync(path.join(d, "404.html"), "nope");
  fs.writeFileSync(path.join(d, "a.webp"), "img");
  const port = await freePort(4700);
  const srv = await serveDist(d, port);
  const get = (p) => fetch(`http://localhost:${port}${p}`);
  try {
    assert.equal(await (await get("/")).text(), "home");
    assert.equal(await (await get("/services/x/")).text(), "svc");
    assert.equal((await get("/a.webp")).headers.get("content-type"), "image/webp");
    const miss = await get("/missing/");
    assert.equal(miss.status, 404); assert.equal(await miss.text(), "nope");
    assert.equal((await get("/../../etc/passwd")).status, 404);
  } finally { srv.close(); }
});
