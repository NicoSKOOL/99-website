import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyPage } from "../plugins/99-website/scripts/verify-seo.mjs";

const business = { name: "Cedar & Stone Landscapes", phone: "(704) 555-0142" };
const page = { url: "/services/paver-patios/", type: "service", keyword: "pavers charlotte nc" };
const html = (o = {}) => `<!doctype html><html><head><title>${o.title ?? "Pavers Charlotte NC: Patios | Cedar &amp; Stone"}</title>
<meta name="description" content="${o.desc ?? "Paver patios in Charlotte NC from $6,500. Walkways and fire pits. Free on-site estimates from the owner."}">
<link rel="canonical" href="${o.canon ?? "http://localhost:4321/services/paver-patios/"}">${o.robots ?? '<meta name="robots" content="noindex, nofollow">'}</head>
<body><h1>${o.h1 ?? "Pavers in Charlotte, NC"}</h1>${o.extra ?? ""}<a href="tel:(704) 555-0142">(704) 555-0142</a>
${o.img ?? '<img src="/img/a-960.webp" width="960" height="720" alt="patio">'}<footer>Cedar &amp; Stone Landscapes</footer></body></html>`;
const run = (o, expectNoindex = true) => verifyPage({ html: html(o), page, business, siteUrl: "http://localhost:4321", expectNoindex });

test("a good page passes", () => assert.deepEqual(run({}), []));
test("keyword must be in the first half of the title", () => assert.match(run({ title: "Beautiful Outdoor Living Spaces and Pavers Charlotte NC" }).join(), /first half/));
test("two h1s fail", () => assert.match(run({ extra: "<h1>Again</h1>" }).join(), /2 <h1>/));
test("short description fails", () => assert.match(run({ desc: "Too short" }).join(), /description/));
test("image without size or non-WebP fails", () => {
  assert.match(run({ img: '<img src="/img/a.png" alt="x">' }).join(), /width|WebP/);
});
test("em dash in visible text fails", () => assert.match(run({ extra: "<p>Patios \u2014 walls</p>" }).join(), /em dash/));
test("noindex must match the build mode", () => {
  assert.match(run({ robots: "" }).join(), /noindex/);
  assert.match(run({}, false).join(), /noindex/);
});
test("skipped heading levels fail", () => assert.match(run({ extra: "<h3>Deep</h3>" }).join(), /h1 to h3/));
test("canonical must be the absolute page url", () => assert.match(run({ canon: "/services/paver-patios/" }).join(), /canonical/));
