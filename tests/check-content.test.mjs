import { test } from "node:test";
import assert from "node:assert/strict";
import { checkContent, similarity } from "../plugins/99-website/scripts/check-content.mjs";

const page = (url, type, slug, keyword = "") => ({ url, type, slug, keyword, page_name: slug, title: slug, parent: "/" });
const site = { business: { name: "Cedar & Stone" }, pages: [
  page("/", "home", "home", "charlotte landscaping"),
  page("/services/paver-patios/", "service", "paver-patios", "pavers charlotte nc"),
  page("/services/retaining-walls/", "service", "retaining-walls", "retaining wall charlotte nc"),
  page("/blog/paver-patio-cost/", "blog", "paver-patio-cost", "paver patio cost"),
] };
const svc = (h1, body) => ({ h1, description: "x".repeat(90), intro: "We come to you.", price: "From $1",
  steps: [{ name: "a", text: "a" }, { name: "b", text: "b" }, { name: "c", text: "c" }],
  faqs: [{ q: "q1", a: "a1" }, { q: "q2", a: "a2" }, { q: "q3", a: "a3" }],
  sections: [{ h2: "Included", paragraphs: [body] }] });
const good = () => ({
  home: { h1: "Charlotte Landscaping Done Right", description: "d".repeat(100), intro: "We design and build yards." },
  "paver-patios": svc("Pavers in Charlotte, NC", "Patios walkways fire pits laid on compacted base with polymeric sand and edge restraint for lasting results in clay soil"),
  "retaining-walls": svc("Retaining Walls in Charlotte", "Block and natural stone walls engineered with drainage aggregate geogrid and weep pipe so they hold back soil for decades"),
  "paver-patio-cost": { h1: "Paver Patio Cost in Charlotte", description: "c".repeat(100), intro: "Prices.", service_link: "/services/paver-patios/", author: "Marcus Hale", date: "2026-09-29" },
});
const msgs = (r) => r.errors.map((e) => `${e.url} ${e.field}: ${e.message}`).join("\n");

test("a clean set passes", () => {
  assert.equal(msgs(checkContent({ site, contents: good(), never: ["cheapest"] })), "");
});

test("keyword words in order, plurals and a missing state are fine", () => {
  const c = good();
  c["paver-patios"].h1 = "Pavers in Charlotte";
  assert.equal(checkContent({ site, contents: c, never: [] }).errors.filter((e) => e.field === "h1").length, 0);
  c["paver-patios"].h1 = "Beautiful Patios";
  assert.match(msgs(checkContent({ site, contents: c, never: [] })), /paver-patios\/ h1/);
});

test("missing file, em dash, NEEDS INPUT and never-say words fail", () => {
  const c = good();
  delete c.home;
  c["retaining-walls"].intro = "Walls \u2014 the cheapest [NEEDS INPUT: x]";
  const m = msgs(checkContent({ site, contents: c, never: ["cheapest"] }));
  assert.match(m, /\/ file: missing/);
  assert.match(m, /em dash/);
  assert.match(m, /NEEDS INPUT/);
  assert.match(m, /cheapest/);
});

test("service pages that read like blog posts fail", () => {
  const c = good();
  c["paver-patios"].sections.push({ h2: "What is a paver patio?", paragraphs: ["x"] });
  c["paver-patios"].author = "Marcus";
  const m = msgs(checkContent({ site, contents: c, never: [] }));
  assert.match(m, /What is/);
  assert.match(m, /author/);
});

test("blog posts must link to a built service page", () => {
  const c = good();
  c["paver-patio-cost"].service_link = "/services/not-built/";
  assert.match(msgs(checkContent({ site, contents: c, never: [] })), /service_link/);
});

test("town-swapped sibling copy is caught", () => {
  const text = "We build paver patios with compacted base polymeric sand and edge restraint for homeowners who want a lasting outdoor space";
  assert.ok(similarity(text, text.replace("homeowners", "Charlotte homeowners")) > 0.5);
  const c = good();
  c["retaining-walls"].sections = c["paver-patios"].sections;
  c["retaining-walls"].intro = c["paver-patios"].intro;
  assert.match(msgs(checkContent({ site, contents: c, never: [] })), /similar/);
});
