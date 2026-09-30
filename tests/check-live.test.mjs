import { test } from "node:test";
import assert from "node:assert/strict";
import { sitemapUrls, checkLivePage } from "../plugins/99-website/scripts/check-live.mjs";

test("sitemapUrls reads every <loc> and decodes &amp;", () => {
  const xml = `<urlset><url><loc>https://a.pages.dev/</loc></url><url><loc>https://a.pages.dev/x/?a=1&amp;b=2</loc></url></urlset>`;
  assert.deepEqual(sitemapUrls(xml), ["https://a.pages.dev/", "https://a.pages.dev/x/?a=1&b=2"]);
});

const page = (o = {}) => ({ url: "https://a.pages.dev/services/x/", status: 200, host: "a.pages.dev", expectNoindex: true,
  html: `<head><link rel="canonical" href="${o.canon ?? "https://a.pages.dev/services/x/"}">${o.robots ?? '<meta name="robots" content="noindex, nofollow">'}</head>`, ...o });

test("a good live page passes", () => assert.deepEqual(checkLivePage(page()), []));
test("non-200 fails", () => assert.match(checkLivePage(page({ status: 404 })).join(), /404/));
test("canonical on another host fails (localhost leaking into production)", () =>
  assert.match(checkLivePage(page({ canon: "http://localhost:4321/services/x/" })).join(), /canonical/));
test("noindex state must match the chosen mode", () => {
  assert.match(checkLivePage(page({ robots: "" })).join(), /noindex/);
  assert.match(checkLivePage(page({ expectNoindex: false })).join(), /noindex/);
});
