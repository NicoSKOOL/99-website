import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { extractPage, parseSitemap, crawlSite } from "../plugins/99-website/scripts/crawl.mjs";

const PAGE = (title, body) => `<!doctype html><html><head><title>${title}</title>
<meta name="description" content="Desc &amp; more"><link rel="canonical" href="/x/">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"LocalBusiness"},{"@type":["Service","Thing"]}]}</script>
<style>.a{}</style></head><body><h1>${title}</h1><h2>Two</h2><p>${body}</p>
<a href="/about/">About</a><a href="tel:+61312345678">Call</a><a href="mailto:hi@x.com">Mail</a>
<a href="https://other.com/">Out</a><img src="a.jpg" alt="ok"><img src="b.jpg"><script>var x=1</script></body></html>`;

let server, base, withSitemap = true;
const routes = () => ({
  "/robots.txt": [200, withSitemap ? `Sitemap: ${base}/sitemap_index.xml\n` : ""],
  "/sitemap_index.xml": [withSitemap ? 200 : 404, `<sitemapindex><sitemap><loc>${base}/page-sitemap.xml</loc></sitemap></sitemapindex>`],
  "/page-sitemap.xml": [200, `<urlset><url><loc>${base}/</loc></url><url><loc>${base}/about/</loc></url><url><loc>${base}/secret/</loc></url><url><loc>${base}/logo.png</loc></url></urlset>`],
  "/": [200, PAGE("Home", "Welcome home")],
  "/about/": [200, PAGE("About us", "We help people")],
  "/secret/": [403, "no"],
});

before(async () => {
  server = http.createServer((req, res) => {
    // Behave like a bot-blocking host: default fetch UA gets 403.
    if (!/Mozilla/.test(req.headers["user-agent"] || "")) { res.writeHead(403); return res.end(); }
    const r = routes()[req.url];
    if (!r) { res.writeHead(404); return res.end(); }
    res.writeHead(r[0], { "content-type": req.url.endsWith(".xml") || req.url.endsWith(".txt") ? "text/xml" : "text/html" });
    res.end(r[1]);
  });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

test("extractPage pulls SEO fields, contacts, schema types and visible text", () => {
  const p = extractPage(PAGE("Home", "Hello world here"), "https://site.com/");
  assert.equal(p.title, "Home");
  assert.equal(p.meta_description, "Desc & more");
  assert.equal(p.canonical, "https://site.com/x/");
  assert.deepEqual(p.h1, ["Home"]);
  assert.deepEqual(p.h2, ["Two"]);
  assert.deepEqual(p.jsonld_types.sort(), ["LocalBusiness", "Service", "Thing"]);
  assert.deepEqual(p.tel, ["+61312345678"]);
  assert.deepEqual(p.mailto, ["hi@x.com"]);
  assert.deepEqual(p.internal_links, ["/about/"]);
  assert.equal(p.images, 2);
  assert.equal(p.images_missing_alt, 1);
  assert.ok(p.text.includes("Hello world here"));
  assert.ok(!p.text.includes("var x"));
});

test("parseSitemap tells an index from a urlset", () => {
  assert.deepEqual(parseSitemap("<sitemapindex><sitemap><loc>https://a/s.xml</loc></sitemap></sitemapindex>"), { isIndex: true, locs: ["https://a/s.xml"] });
  assert.deepEqual(parseSitemap("<urlset><url><loc> https://a/p/ </loc></url></urlset>"), { isIndex: false, locs: ["https://a/p/"] });
});

test("crawlSite follows nested sitemaps, sends a browser UA, lists blocked pages", async () => {
  withSitemap = true;
  const r = await crawlSite(`${base}/`, { limit: 50 });
  assert.equal(r.source, "sitemap");
  assert.deepEqual(r.pages.map((p) => p.path).sort(), ["/", "/about/"]);
  assert.deepEqual(r.blocked.map((b) => [new URL(b.url).pathname, b.status]), [["/secret/", 403]]);
});

test("crawlSite falls back to homepage links when there is no sitemap", async () => {
  withSitemap = false;
  const r = await crawlSite(`${base}/`, { limit: 50 });
  assert.equal(r.source, "links");
  assert.deepEqual(r.pages.map((p) => p.path).sort(), ["/", "/about/"]);
});

test("extractPage drops header, nav and footer from text and decodes all entities", () => {
  const html = `<html><head><title>T</title></head><body><header><nav>Home Services About</nav></header>
<main><h1>Hoarding &#x26; Squalor</h1><p>&ldquo;Kind&rdquo; team&#8217;s work &rarr; done</p></main>
<footer>&copy; 2026 Footer links</footer></body></html>`;
  const p = extractPage(html, "https://site.com/a/");
  assert.equal(p.text, "Hoarding & Squalor “Kind” team’s work → done");
  assert.deepEqual(p.h1, ["Hoarding & Squalor"]);
});
